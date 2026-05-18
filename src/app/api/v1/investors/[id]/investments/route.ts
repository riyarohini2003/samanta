import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { investmentCreateSchema } from "@/lib/zod-schemas/investment";
import { ok, created, handleError, notFound, unauthorized, forbidden } from "@/lib/api";
import { nextInvestmentCode } from "@/server/counters";
import { writeAudit, getRequestMeta } from "@/server/audit";
import dayjs from "@/lib/dayjs";
import { buildInvestmentSchedule } from "@/server/services/investment-payouts";

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
    const investmentDate = dayjs.utc(body.investmentDate).startOf("day").toDate();

    const schedule = buildInvestmentSchedule({
      principalAmount: body.principalAmount,
      interestRate: body.interestRate,
      tenureMonths: body.tenureMonths,
      investmentDate,
      payoutMode: body.payoutMode,
      customPayouts: body.customPayouts,
    });

    const investment = await prisma.investment.create({
      data: {
        investmentCode: code,
        investorId: params.id,
        principalAmount: body.principalAmount,
        interestRate: body.interestRate,
        tenureMonths: body.tenureMonths,
        investmentDate,
        maturityDate: schedule.maturityDate,
        interestAmount: schedule.interestAmount,
        totalReturn: schedule.totalReturn,
        payoutMode: body.payoutMode,
        agreementDate: body.agreementDate ? dayjs.utc(body.agreementDate).toDate() : null,
        notes: body.notes ?? null,
        payouts: {
          create: schedule.payouts.map((p) => ({
            payoutNo: p.payoutNo,
            dueDate: p.dueDate,
            principalDue: p.principalDue,
            interestDue: p.interestDue,
            totalDue: p.totalDue,
          })),
        },
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
