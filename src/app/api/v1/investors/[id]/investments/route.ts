import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { investmentCreateSchema, investmentUpdateSchema } from "@/lib/zod-schemas/investment";
import { ok, created, handleError, notFound, unauthorized, forbidden } from "@/lib/api";
import { nextInvestmentCode } from "@/server/counters";
import { writeAudit, getRequestMeta } from "@/server/audit";
import dayjs from "@/lib/dayjs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN");
    const investments = await prisma.investment.findMany({
      where: { investorId: params.id },
      orderBy: { investmentDate: "desc" },
    });
    return ok(investments);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = investmentCreateSchema.parse(await req.json());

    const investor = await prisma.investor.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
    });
    if (!investor) return notFound("Investor not found");

    const code = await nextInvestmentCode();
    const investmentDate = dayjs.utc(body.investmentDate).toDate();
    const maturityDate = dayjs.utc(body.investmentDate).add(body.tenureMonths, "month").toDate();

    // Simple interest: I = P * R/100 * T(years)
    const tenureYears = body.tenureMonths / 12;
    const interestAmount = Math.round(body.principalAmount * (body.interestRate / 100) * tenureYears * 100) / 100;
    const totalReturn = Math.round((body.principalAmount + interestAmount) * 100) / 100;

    const investment = await prisma.investment.create({
      data: {
        investmentCode: code,
        investorId: params.id,
        principalAmount: body.principalAmount,
        interestRate: body.interestRate,
        tenureMonths: body.tenureMonths,
        investmentDate,
        maturityDate,
        interestAmount,
        totalReturn,
        notes: body.notes ?? null,
      },
    });

    await writeAudit({
      userId: user.id,
      action: "INVESTMENT_CREATED",
      entityType: "Investment",
      entityId: investment.id,
      after: investment,
      ...getRequestMeta(req),
    });

    return created(investment);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
