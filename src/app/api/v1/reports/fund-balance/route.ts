import { NextRequest } from "next/server";
import { ok, unauthorized, forbidden, handleError, badRequest } from "@/lib/api";
import { getCurrentUser } from "@/server/auth/session";
import {
  getFundBreakdown,
  getFundLedger,
} from "@/server/services/fund-balance-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role === "EMPLOYEE") return forbidden("Fund report is admin-only");

    const sp = req.nextUrl.searchParams;
    const fromStr = sp.get("from");
    const toStr = sp.get("to");

    const from = parseDate(fromStr, false);
    const to = parseDate(toStr, true);

    if (fromStr && !from) return badRequest("Invalid 'from' date");
    if (toStr && !to) return badRequest("Invalid 'to' date");
    if (from && to && from > to) return badRequest("'from' must be on or before 'to'");

    const range = { from, to };
    const [breakdown, ledger] = await Promise.all([
      getFundBreakdown(range),
      getFundLedger(range),
    ]);

    return ok({
      breakdown,
      ledger: ledger.map((e) => ({ ...e, date: e.date.toISOString() })),
    });
  } catch (e) {
    return handleError(e);
  }
}

function parseDate(s: string | null, endOfDay: boolean): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}
