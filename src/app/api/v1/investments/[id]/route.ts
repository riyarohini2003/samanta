import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { investmentUpdateSchema } from "@/lib/zod-schemas/investment";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = investmentUpdateSchema.parse(await req.json());
    const before = await prisma.investment.findUnique({ where: { id: params.id } });
    if (!before) return notFound("Investment not found");

    const updated = await prisma.investment.update({ where: { id: params.id }, data: body });
    await writeAudit({
      userId: user.id,
      action: "INVESTMENT_UPDATED",
      entityType: "Investment",
      entityId: updated.id,
      before,
      after: updated,
      ...getRequestMeta(req),
    });
    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
