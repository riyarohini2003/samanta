import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";

/**
 * Returns customer profile, loan history, and per-loan-type eligibility.
 * Used by the "Existing Customer Loan Types" flow.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, deletedAt: { isSet: false }, ...scopeWhere(me) },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        documents: true,
      },
    });
    if (!customer) return notFound("Customer not found or not in your scope");

    // Fetch all loan applications (non-rejected, non-closed)
    const applications = await prisma.loanApplication.findMany({
      where: { customerId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        applicationNo: true,
        loanType: true,
        principal: true,
        installmentAmount: true,
        totalPayable: true,
        status: true,
        createdAt: true,
        startDate: true,
        maturityDate: true,
      },
    });

    // Fetch all loan accounts
    const loans = await prisma.loanAccount.findMany({
      where: { customerId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        accountNo: true,
        loanType: true,
        principal: true,
        totalPayable: true,
        paidAmount: true,
        pendingAmount: true,
        overdueAmount: true,
        installmentAmount: true,
        status: true,
        disbursedAt: true,
        maturityDate: true,
      },
    });

    // Determine eligibility per loan type
    const loanTypes = ["DAILY", "WEEKLY", "MONTHLY"] as const;
    const eligibility = loanTypes.map((type) => {
      const activeLoans = loans.filter(
        (l) => l.loanType === type && ["ACTIVE", "OVERDUE"].includes(l.status)
      );
      const pendingApps = applications.filter(
        (a) =>
          a.loanType === type &&
          ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(a.status)
      );

      const hasActiveLoan = activeLoans.length > 0;
      const hasPendingApp = pendingApps.length > 0;
      const eligible = !hasActiveLoan && !hasPendingApp;

      let reason = "";
      if (hasActiveLoan) {
        reason = `Active ${type.toLowerCase()} loan exists (${activeLoans[0].accountNo})`;
      } else if (hasPendingApp) {
        reason = `Pending ${type.toLowerCase()} application (${pendingApps[0].applicationNo})`;
      }

      return { type, eligible, reason, activeLoans, pendingApps };
    });

    // Overall flags
    const hasOverdueLoans = loans.some((l) => l.status === "OVERDUE");
    const hasNpaLoans = loans.some((l) => l.status === "NPA");

    return ok({
      customer,
      applications,
      loans,
      eligibility,
      warnings: {
        hasOverdueLoans,
        hasNpaLoans,
        overdueCount: loans.filter((l) => l.status === "OVERDUE").length,
        npaCount: loans.filter((l) => l.status === "NPA").length,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
