import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { ok, unauthorized, forbidden, badRequest, handleError } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export const CATEGORIES = [
  "notifications",
  "audit-logs",
  "sessions",
  "payments",
  "investments",
  "investors",
  "loans",
  "customers",
  "all",
] as const;

export type Category = (typeof CATEGORIES)[number];

type Mode = "preview" | "commit";

/** Per-category description shown in UI + included in audit payload. */
const CATEGORY_LABELS: Record<Category, string> = {
  notifications: "Notifications",
  "audit-logs": "Audit Logs",
  sessions: "Sessions",
  payments: "Payments / Collections (loan balances will be reset)",
  investments: "Investments + Payouts",
  investors: "Investors + Investments + Payouts",
  loans: "Loans (applications, schedules, payments)",
  customers: "Customers (and all of their loans/payments)",
  all: "Everything except Users, Branches, Settings",
};

/** Counter keys to reset per category (so the next created record starts from 1 again). */
const COUNTERS_TO_RESET: Record<Category, string[]> = {
  notifications: [],
  "audit-logs": [],
  sessions: [],
  payments: ["receipt"],
  investments: ["investment"],
  investors: ["investment", "investor"],
  loans: ["receipt", "loanAccount", "application"],
  customers: ["receipt", "loanAccount", "application", "customer"],
  all: ["receipt", "loanAccount", "application", "customer", "investment", "investor"],
};

/** Compute current counts for the UI badges. */
async function currentCounts() {
  const [
    notifications,
    auditLogs,
    sessions,
    payments,
    schedules,
    loans,
    applications,
    appDocs,
    customers,
    customerDocs,
    investors,
    investments,
    payouts,
  ] = await Promise.all([
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.session.count(),
    prisma.payment.count(),
    prisma.repaymentSchedule.count(),
    prisma.loanAccount.count(),
    prisma.loanApplication.count(),
    prisma.loanAppDocument.count(),
    prisma.customer.count(),
    prisma.customerDocument.count(),
    prisma.investor.count(),
    prisma.investment.count(),
    prisma.investmentPayout.count(),
  ]);
  return {
    notifications,
    auditLogs,
    sessions,
    payments,
    repaymentSchedules: schedules,
    loanAccounts: loans,
    loanApplications: applications,
    loanAppDocuments: appDocs,
    customers,
    customerDocuments: customerDocs,
    investors,
    investments,
    investmentPayouts: payouts,
  };
}

/** What each category will touch, used by both preview + commit. */
async function impactFor(category: Category) {
  const c = await currentCounts();
  switch (category) {
    case "notifications":
      return { notifications: c.notifications };
    case "audit-logs":
      return { auditLogs: c.auditLogs };
    case "sessions":
      return { sessions: c.sessions };
    case "payments":
      return {
        payments: c.payments,
        repaymentSchedulesReset: c.repaymentSchedules,
        loanAccountsReset: c.loanAccounts,
      };
    case "investments":
      return {
        investmentPayouts: c.investmentPayouts,
        investments: c.investments,
      };
    case "investors":
      return {
        investmentPayouts: c.investmentPayouts,
        investments: c.investments,
        investors: c.investors,
      };
    case "loans":
      return {
        payments: c.payments,
        repaymentSchedules: c.repaymentSchedules,
        loanAccounts: c.loanAccounts,
        loanAppDocuments: c.loanAppDocuments,
        loanApplications: c.loanApplications,
      };
    case "customers":
      return {
        payments: c.payments,
        repaymentSchedules: c.repaymentSchedules,
        loanAccounts: c.loanAccounts,
        loanAppDocuments: c.loanAppDocuments,
        loanApplications: c.loanApplications,
        customerDocuments: c.customerDocuments,
        customers: c.customers,
      };
    case "all":
      return {
        notifications: c.notifications,
        auditLogs: c.auditLogs,
        sessions: c.sessions,
        payments: c.payments,
        repaymentSchedules: c.repaymentSchedules,
        loanAccounts: c.loanAccounts,
        loanAppDocuments: c.loanAppDocuments,
        loanApplications: c.loanApplications,
        customerDocuments: c.customerDocuments,
        customers: c.customers,
        investmentPayouts: c.investmentPayouts,
        investments: c.investments,
        investors: c.investors,
      };
  }
}

/** Reset loan accounts + repayment schedules back to a clean unpaid state. */
async function resetLoanPaidState() {
  const schedules = await prisma.repaymentSchedule.updateMany({
    data: { paidAmount: 0, status: "PENDING", paidAt: null, penaltyAmount: 0 },
  });
  const loans = await prisma.loanAccount.updateMany({
    data: {
      paidAmount: 0,
      overdueAmount: 0,
      penaltyAmount: 0,
      status: "ACTIVE",
      closedAt: null,
    },
  });
  // Re-sync pendingAmount = totalPayable for every loan. updateMany can't reference
  // another field, so we do it in JS for any rows that need it. Cheap — bounded by
  // loan count, not payment count.
  const all = await prisma.loanAccount.findMany({
    select: { id: true, totalPayable: true, pendingAmount: true },
  });
  for (const l of all) {
    if (l.pendingAmount !== l.totalPayable) {
      await prisma.loanAccount.update({
        where: { id: l.id },
        data: { pendingAmount: l.totalPayable },
      });
    }
  }
  return { schedulesReset: schedules.count, loansReset: loans.count };
}

async function runCommit(category: Category): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  // Helpers — each returns the count actually deleted.
  const delPayments = async () => {
    const r = await prisma.payment.deleteMany();
    result.payments = r.count;
  };
  const delSchedules = async () => {
    const r = await prisma.repaymentSchedule.deleteMany();
    result.repaymentSchedules = r.count;
  };
  const delLoanAccounts = async () => {
    const r = await prisma.loanAccount.deleteMany();
    result.loanAccounts = r.count;
  };
  const delAppDocs = async () => {
    const r = await prisma.loanAppDocument.deleteMany();
    result.loanAppDocuments = r.count;
  };
  const delApplications = async () => {
    const r = await prisma.loanApplication.deleteMany();
    result.loanApplications = r.count;
  };
  const delCustomerDocs = async () => {
    const r = await prisma.customerDocument.deleteMany();
    result.customerDocuments = r.count;
  };
  const delCustomers = async () => {
    const r = await prisma.customer.deleteMany();
    result.customers = r.count;
  };
  const delPayouts = async () => {
    const r = await prisma.investmentPayout.deleteMany();
    result.investmentPayouts = r.count;
  };
  const delInvestments = async () => {
    const r = await prisma.investment.deleteMany();
    result.investments = r.count;
  };
  const delInvestors = async () => {
    const r = await prisma.investor.deleteMany();
    result.investors = r.count;
  };
  const delNotifications = async () => {
    const r = await prisma.notification.deleteMany();
    result.notifications = r.count;
  };
  const delAuditLogs = async () => {
    const r = await prisma.auditLog.deleteMany();
    result.auditLogs = r.count;
  };
  const delSessions = async () => {
    const r = await prisma.session.deleteMany();
    result.sessions = r.count;
  };

  switch (category) {
    case "notifications":
      await delNotifications();
      break;
    case "audit-logs":
      await delAuditLogs();
      break;
    case "sessions":
      await delSessions();
      break;
    case "payments": {
      await delPayments();
      const reset = await resetLoanPaidState();
      result.repaymentSchedulesReset = reset.schedulesReset;
      result.loanAccountsReset = reset.loansReset;
      break;
    }
    case "investments":
      await delPayouts();
      await delInvestments();
      break;
    case "investors":
      await delPayouts();
      await delInvestments();
      await delInvestors();
      break;
    case "loans":
      // Children first
      await delPayments();
      await delSchedules();
      await delLoanAccounts();
      await delAppDocs();
      await delApplications();
      break;
    case "customers":
      // Loan chain first, then customer chain
      await delPayments();
      await delSchedules();
      await delLoanAccounts();
      await delAppDocs();
      await delApplications();
      await delCustomerDocs();
      await delCustomers();
      break;
    case "all":
      await delNotifications();
      await delPayments();
      await delSchedules();
      await delLoanAccounts();
      await delAppDocs();
      await delApplications();
      await delCustomerDocs();
      await delCustomers();
      await delPayouts();
      await delInvestments();
      await delInvestors();
      // Audit logs + sessions last so we still have history during the wipe.
      await delAuditLogs();
      await delSessions();
      break;
  }

  // Reset relevant counters so newly created records start fresh
  const counterKeys = COUNTERS_TO_RESET[category];
  if (counterKeys.length > 0) {
    await prisma.counter.deleteMany({ where: { key: { in: counterKeys } } });
    result.countersReset = counterKeys.length;
  }

  return result;
}

export async function GET() {
  try {
    const me = await requireUser();
    if (me.role !== "SUPER_ADMIN") {
      return forbidden("Only super admins can access data cleanup");
    }

    const [counts, lastBackup] = await Promise.all([
      currentCounts(),
      prisma.backupSnapshot.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, filename: true, trigger: true },
      }),
    ]);

    return ok({ counts, lastBackup });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    if (me.role !== "SUPER_ADMIN") {
      return forbidden("Only super admins can clear data");
    }

    const body = await req.json().catch(() => null);
    const category = body?.category as Category | undefined;
    const mode = (body?.mode as Mode | undefined) ?? "preview";
    const confirm = typeof body?.confirm === "string" ? body.confirm : "";

    if (!category || !CATEGORIES.includes(category)) {
      return badRequest("Invalid category");
    }
    if (mode !== "preview" && mode !== "commit") {
      return badRequest("mode must be 'preview' or 'commit'");
    }

    if (mode === "preview") {
      const impact = await impactFor(category);
      return ok({ category, mode, label: CATEGORY_LABELS[category], impact });
    }

    // Commit — require the exact type-to-confirm phrase
    const expected = `DELETE ${category.toUpperCase()}`;
    if (confirm !== expected) {
      return badRequest(`Confirmation phrase mismatch — type "${expected}" to proceed`);
    }

    // Write audit FIRST so that even when clearing audit-logs / all, the
    // initiating action is still recorded (we'll overwrite below for those).
    const impactBefore = await impactFor(category);
    if (category !== "audit-logs" && category !== "all") {
      await writeAudit({
        userId: me.id,
        action: "DATA_CLEANUP",
        entityType: "System",
        entityId: category,
        before: impactBefore,
        ...getRequestMeta(req),
      });
    }

    const deleted = await runCommit(category);

    // For audit-logs / all clears, write the audit AFTER so the wipe doesn't
    // remove its own entry.
    if (category === "audit-logs" || category === "all") {
      await writeAudit({
        userId: me.id,
        action: "DATA_CLEANUP",
        entityType: "System",
        entityId: category,
        before: impactBefore,
        after: deleted,
        ...getRequestMeta(req),
      });
    }

    return ok({ category, mode, label: CATEGORY_LABELS[category], deleted });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
