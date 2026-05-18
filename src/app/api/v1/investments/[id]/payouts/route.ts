import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN");
    const investment = await prisma.investment.findUnique({
      where: { id: params.id },
      include: { payouts: { orderBy: { payoutNo: "asc" } } },
    });
    if (!investment) return notFound("Investment not found");
    return ok(investment.payouts);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
