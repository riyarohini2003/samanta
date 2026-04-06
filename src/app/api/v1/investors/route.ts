import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { investorCreateSchema } from "@/lib/zod-schemas/investment";
import { ok, created, handleError, unauthorized, forbidden } from "@/lib/api";
import { nextInvestorCode } from "@/server/counters";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const investors = await prisma.investor.findMany({
      where: {
        deletedAt: { isSet: false },
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { investorCode: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { investments: true } },
        investments: {
          where: { status: "ACTIVE" },
          select: { principalAmount: true, interestAmount: true, totalReturn: true, paidAmount: true },
        },
      },
    });

    // Compute summary for each investor
    const data = investors.map((inv) => {
      const totalPrincipal = inv.investments.reduce((s, i) => s + i.principalAmount, 0);
      const totalInterest = inv.investments.reduce((s, i) => s + i.interestAmount, 0);
      const totalReturn = inv.investments.reduce((s, i) => s + i.totalReturn, 0);
      const totalPaid = inv.investments.reduce((s, i) => s + i.paidAmount, 0);
      const { investments: _, ...rest } = inv;
      return { ...rest, totalPrincipal, totalInterest, totalReturn, totalPaid };
    });

    return ok(data);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = investorCreateSchema.parse(await req.json());
    const code = await nextInvestorCode();

    const investor = await prisma.investor.create({
      data: { ...body, investorCode: code },
    });

    await writeAudit({
      userId: user.id,
      action: "INVESTOR_CREATED",
      entityType: "Investor",
      entityId: investor.id,
      after: investor,
      ...getRequestMeta(req),
    });

    return created(investor);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
