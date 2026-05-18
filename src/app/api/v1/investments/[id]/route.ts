import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { investmentUpdateSchema } from "@/lib/zod-schemas/investment";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";
import dayjs from "@/lib/dayjs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = investmentUpdateSchema.parse(await req.json());
    const before = await prisma.investment.findUnique({ where: { id: params.id } });
    if (!before) return notFound("Investment not found");

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      data.status = body.status;
      // Stamp closedAt when transitioning out of ACTIVE; clear when reverting.
      if (body.status === "ACTIVE") {
        data.closedAt = null;
      } else if (before.status === "ACTIVE") {
        data.closedAt = new Date();
      }
    }
    if (body.paidAmount !== undefined) data.paidAmount = body.paidAmount;
    if (body.agreementDate !== undefined) {
      data.agreementDate = body.agreementDate
        ? dayjs.utc(body.agreementDate).toDate()
        : null;
    }
    if (body.notes !== undefined) data.notes = body.notes;

    const updated = await prisma.investment.update({
      where: { id: params.id },
      data,
    });
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
