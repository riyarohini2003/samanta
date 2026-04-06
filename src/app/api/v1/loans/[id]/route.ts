import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const loan = await prisma.loanAccount.findFirst({
      where: { id: params.id, ...loanScopeWhere(me) },
      include: {
        customer: true,
        branch: true,
        assignedEmployee: { select: { id: true, name: true, employeeCode: true } },
        schedule: { orderBy: { installmentNo: "asc" } },
        payments: { orderBy: { collectedAt: "desc" }, take: 50 },
        application: true,
      },
    });
    if (!loan) return notFound();
    return ok(loan);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
