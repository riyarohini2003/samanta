import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { paymentCreateSchema } from "@/lib/zod-schemas/collection";
import { recordPayment } from "@/server/services/collection-service";
import { ok, created, handleError, unauthorized } from "@/lib/api";
import { getRequestMeta } from "@/server/audit";

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = paymentCreateSchema.parse(await req.json());
    const result = await recordPayment({ user: me, ...body, ...getRequestMeta(req) });
    return result.duplicate ? ok(result.payment) : created(result.payment);
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    return handleError(e);
  }
}
