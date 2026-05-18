import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { dueListQuerySchema } from "@/lib/zod-schemas/collection";
import { getDueList, getDueSummary, ensureOverdueMarked } from "@/server/services/collection-service";
import { ok, handleError, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const parsed = dueListQuerySchema.parse({
      date: searchParams.get("date") ?? new Date().toISOString().slice(0, 10),
      dateTo: searchParams.get("dateTo") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
      loanType: searchParams.get("loanType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
    });

    await ensureOverdueMarked();

    const [rows, summary] = await Promise.all([
      getDueList({ user: me, ...parsed }),
      getDueSummary({ user: me, ...parsed }),
    ]);

    return ok({ rows, summary });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    return handleError(e);
  }
}
