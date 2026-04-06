import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { investorUpdateSchema } from "@/lib/zod-schemas/investment";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN");
    const investor = await prisma.investor.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
      include: {
        investments: { orderBy: { investmentDate: "desc" } },
        _count: { select: { investments: true } },
      },
    });
    if (!investor) return notFound("Investor not found");
    return ok(investor);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = investorUpdateSchema.parse(await req.json());
    const before = await prisma.investor.findUnique({ where: { id: params.id } });
    if (!before) return notFound("Investor not found");

    const updated = await prisma.investor.update({ where: { id: params.id }, data: body });
    await writeAudit({
      userId: user.id,
      action: "INVESTOR_UPDATED",
      entityType: "Investor",
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");

    const existing = await prisma.investor.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
    });
    if (!existing) return notFound("Investor not found");

    const activeInvestments = await prisma.investment.count({
      where: { investorId: params.id, status: "ACTIVE" },
    });
    if (activeInvestments > 0) {
      return badRequest(`Cannot delete — investor has ${activeInvestments} active investment${activeInvestments === 1 ? "" : "s"}`);
    }

    const investor = await prisma.investor.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await writeAudit({
      userId: user.id,
      action: "INVESTOR_DELETED",
      entityType: "Investor",
      entityId: investor.id,
      ...getRequestMeta(req),
    });
    return ok({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
