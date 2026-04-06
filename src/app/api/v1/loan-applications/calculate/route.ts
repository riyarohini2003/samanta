import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { loanCalcSchema } from "@/lib/zod-schemas/loan";
import { calculateLoan } from "@/server/services/loan-calculator";
import { ok, handleError, unauthorized } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = loanCalcSchema.parse(await req.json());
    const result = calculateLoan(body);
    return ok(result);
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    return handleError(e);
  }
}
