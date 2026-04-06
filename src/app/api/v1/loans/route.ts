import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";
import { ok, handleError, unauthorized, forbidden } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;

    const loans = await prisma.loanAccount.findMany({
      where: {
        ...loanScopeWhere(me),
        ...(status ? { status: status as any } : {}),
        ...(type ? { loanType: type as any } : {}),
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { id: true, customerCode: true, fullName: true, mobile: true } },
        branch: { select: { code: true, name: true } },
        assignedEmployee: { select: { id: true, name: true, employeeCode: true } },
      },
    });
    return ok(loans);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
