import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api";
import { getCurrentUser } from "@/server/auth/session";
import { generateReport, REPORT_TYPES, type ReportType, type ReportFilters } from "@/server/services/report-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role === "EMPLOYEE") return forbidden("Reports are admin-only");

    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") as ReportType | null;

    if (!type || !(type in REPORT_TYPES)) {
      return badRequest(
        `Invalid report type. Valid types: ${Object.keys(REPORT_TYPES).join(", ")}`
      );
    }

    const filters: ReportFilters = {
      date: sp.get("date") ?? undefined,
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
      branchId: sp.get("branchId") ?? undefined,
      employeeId: sp.get("employeeId") ?? undefined,
      customerId: sp.get("customerId") ?? undefined,
      loanType: sp.get("loanType") ?? undefined,
      status: sp.get("status") ?? undefined,
    };

    const report = await generateReport(type, user, filters);
    return ok(report);
  } catch (e) {
    return handleError(e);
  }
}
