import { NextRequest } from "next/server";
import { requireRole, AuthError } from "@/server/auth/session";
import { loanDisburseSchema } from "@/lib/zod-schemas/loan";
import { disburseApplication } from "@/server/services/loan-disburse";
import { ok, handleError, unauthorized, forbidden } from "@/lib/api";
import { getRequestMeta } from "@/server/audit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = loanDisburseSchema.parse(await req.json());

    const meta = getRequestMeta(req);
    const account = await disburseApplication({
      applicationId: params.id,
      assignedEmployeeId: body.assignedEmployeeId,
      disbursementMode: body.disbursementMode,
      disbursedAt: body.disbursedAt ? new Date(body.disbursedAt) : undefined,
      firstDueDate: body.firstDueDate ? new Date(body.firstDueDate) : undefined,
      actorUserId: me.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok(account);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
