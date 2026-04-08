import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { ok, badRequest, handleError, unauthorized, forbidden } from "@/lib/api";
import { getRequestMeta } from "@/server/audit";
import { closeLoan, preCloseLoan } from "@/server/services/loan-closure";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { type = "close", waiverAmount } = body;

    const meta = getRequestMeta(req);

    if (type === "preclose") {
      const loan = await preCloseLoan({
        user: me,
        loanAccountId: params.id,
        waiverAmount: waiverAmount ? Number(waiverAmount) : 0,
        actorUserId: me.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return ok(loan);
    }

    const loan = await closeLoan({
      user: me,
      loanAccountId: params.id,
      actorUserId: me.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok(loan);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    if (e instanceof Error) return badRequest(e.message);
    return handleError(e);
  }
}
