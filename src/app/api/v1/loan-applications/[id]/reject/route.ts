import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { loanRejectSchema } from "@/lib/zod-schemas/loan";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = loanRejectSchema.parse(await req.json());

    const app = await prisma.loanApplication.findUnique({ where: { id: params.id } });
    if (!app) return notFound();
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) {
      return badRequest(`Cannot reject from status ${app.status}`);
    }

    const updated = await prisma.loanApplication.update({
      where: { id: app.id },
      data: {
        status: "REJECTED",
        reviewedById: me.id,
        reviewedAt: new Date(),
        reviewRemark: body.remark,
      },
    });

    await writeAudit({
      userId: me.id,
      action: "APPLICATION_REJECTED",
      entityType: "LoanApplication",
      entityId: app.id,
      before: app,
      after: updated,
      ...getRequestMeta(req),
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
