import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/guards";
import { ok, badRequest, handleError, unauthorized, forbidden } from "@/lib/api";
import { getRequestMeta } from "@/server/audit";
import { paymentUpdateSchema } from "@/lib/zod-schemas/collection";
import { updatePayment } from "@/server/services/collection-service";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    if (!isAdmin(me)) return forbidden("Only admins can edit payments");

    const body = paymentUpdateSchema.parse(await req.json());
    const meta = getRequestMeta(req);

    const payment = await updatePayment({
      user: me,
      paymentId: params.id,
      amount: body.amount,
      penalty: body.penalty,
      mode: body.mode,
      note: body.note ?? null,
      collectedAt: body.collectedAt ? new Date(body.collectedAt) : undefined,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok(payment);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    if (e instanceof Error && (e.message === "Payment not found" || e.message === "Loan not found")) {
      return badRequest(e.message);
    }
    return handleError(e);
  }
}
