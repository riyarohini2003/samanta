import { prisma } from "@/server/db";
import dayjs from "@/lib/dayjs";
import { toDateOnly } from "@/lib/dayjs";
import type { Prisma, PaymentMode } from "@prisma/client";
import { nextReceiptNo } from "@/server/counters";
import { toNumber } from "@/lib/formatters";
import type { CurrentUser } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";

/** Build a dueDate filter: range for DUE_ON (handles timezone-offset dates), lte for DUE_UPTO */
function dueDateFilter(date: Date, mode: "DUE_ON" | "DUE_UPTO"): Prisma.DateTimeFilter {
  if (mode === "DUE_UPTO") return { lte: dayjs.utc(date).endOf("day").toDate() };
  // DUE_ON: match any time within the calendar day (UTC)
  return {
    gte: dayjs.utc(date).startOf("day").toDate(),
    lt: dayjs.utc(date).add(1, "day").startOf("day").toDate(),
  };
}

/**
 * Unified due list. Returns every RepaymentSchedule row matching the filters,
 * together with the parent LoanAccount + Customer + Branch.
 *
 * This is THE query that makes daily/weekly/monthly loans unified — because
 * schedules are pre-generated at disbursement, a single WHERE clause on dueDate
 * finds everyone due on that date regardless of loan cadence.
 */
export async function getDueList(params: {
  user: CurrentUser;
  date: string; // YYYY-MM-DD
  branchId?: string;
  employeeId?: string;
  loanType?: "DAILY" | "WEEKLY" | "MONTHLY";
  status?: "ALL" | "PENDING" | "PAID" | "PARTIAL" | "MISSED";
  q?: string;
  mode?: "DUE_ON" | "DUE_UPTO";
}) {
  const date = toDateOnly(params.date);
  const mode = params.mode ?? "DUE_ON";

  const loanWhere: Prisma.LoanAccountWhereInput = {
    ...loanScopeWhere(params.user),
    status: { in: ["ACTIVE", "OVERDUE"] },
    ...(params.branchId ? { branchId: params.branchId } : {}),
    ...(params.employeeId ? { assignedEmployeeId: params.employeeId } : {}),
    ...(params.loanType ? { loanType: params.loanType } : {}),
    ...(params.q
      ? {
          OR: [
            { accountNo: { contains: params.q, mode: "insensitive" } },
            { customer: { fullName: { contains: params.q, mode: "insensitive" } } },
            { customer: { mobile: { contains: params.q } } },
            { customer: { customerCode: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const scheduleWhere: Prisma.RepaymentScheduleWhereInput = {
    dueDate: dueDateFilter(date, mode),
    ...(params.status && params.status !== "ALL"
      ? { status: params.status as any }
      : { status: { in: ["PENDING", "PARTIAL", "MISSED"] } }),
    loanAccount: loanWhere,
  };

  const rows = await prisma.repaymentSchedule.findMany({
    where: scheduleWhere,
    include: {
      loanAccount: {
        include: {
          customer: {
            select: { id: true, customerCode: true, fullName: true, mobile: true },
          },
          branch: { select: { id: true, code: true, name: true } },
          assignedEmployee: { select: { id: true, name: true, employeeCode: true } },
        },
      },
    },
    orderBy: [
      { loanAccount: { branch: { code: "asc" } } },
      { loanAccount: { accountNo: "asc" } },
      { installmentNo: "asc" },
    ],
    take: 500,
  });

  return rows;
}

/** Summary aggregate for dashboard cards. */
export async function getDueSummary(params: {
  user: CurrentUser;
  date: string;
  branchId?: string;
  employeeId?: string;
  loanType?: "DAILY" | "WEEKLY" | "MONTHLY";
  status?: "ALL" | "PENDING" | "PAID" | "PARTIAL" | "MISSED";
  q?: string;
  mode?: "DUE_ON" | "DUE_UPTO";
}) {
  const date = toDateOnly(params.date);
  const mode = params.mode ?? "DUE_ON";

  const loanWhere: Prisma.LoanAccountWhereInput = {
    ...loanScopeWhere(params.user),
    status: { in: ["ACTIVE", "OVERDUE"] },
    ...(params.branchId ? { branchId: params.branchId } : {}),
    ...(params.employeeId ? { assignedEmployeeId: params.employeeId } : {}),
    ...(params.loanType ? { loanType: params.loanType } : {}),
    ...(params.q
      ? {
          OR: [
            { accountNo: { contains: params.q, mode: "insensitive" } },
            { customer: { fullName: { contains: params.q, mode: "insensitive" } } },
            { customer: { mobile: { contains: params.q } } },
            { customer: { customerCode: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // Apply the same status filter used by getDueList so summary matches the table
  const statusFilter: Prisma.RepaymentScheduleWhereInput =
    params.status && params.status !== "ALL"
      ? { status: params.status as any }
      : { status: { in: ["PENDING", "PARTIAL", "MISSED"] } };

  const where: Prisma.RepaymentScheduleWhereInput = {
    dueDate: dueDateFilter(date, mode),
    ...statusFilter,
    loanAccount: loanWhere,
  };

  // For "ALL" or no specific status, we need per-status counts from within the filtered set
  const baseWhere: Prisma.RepaymentScheduleWhereInput = {
    dueDate: dueDateFilter(date, mode),
    loanAccount: loanWhere,
  };

  // Build scope filter for payments (branch / employee restrictions)
  const paymentScopeWhere: Prisma.PaymentWhereInput = {
    isReversed: false,
    ...(params.user.role === "EMPLOYEE"
      ? { collectedById: params.user.id }
      : params.employeeId
      ? { collectedById: params.employeeId }
      : {}),
    ...(params.branchId
      ? { loanAccount: { branchId: params.branchId } }
      : params.user.role === "BRANCH_MANAGER" && params.user.branchId
      ? { loanAccount: { branchId: params.user.branchId } }
      : {}),
  };

  const [all, paid, partial, missed, pending, collectedOnDate] = await Promise.all([
    prisma.repaymentSchedule.aggregate({
      where,
      _sum: { dueAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.repaymentSchedule.aggregate({
      where: { ...baseWhere, status: "PAID" },
      _sum: { dueAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.repaymentSchedule.aggregate({
      where: { ...baseWhere, status: "PARTIAL" },
      _sum: { dueAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.repaymentSchedule.aggregate({
      where: { ...baseWhere, status: "MISSED" },
      _sum: { dueAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.repaymentSchedule.aggregate({
      where: { ...baseWhere, status: "PENDING" },
      _sum: { dueAmount: true, paidAmount: true },
      _count: true,
    }),
    // Actual collections made on the selected date (by collectedAt, not dueDate)
    prisma.payment.aggregate({
      where: {
        ...paymentScopeWhere,
        collectedAt: {
          gte: dayjs.utc(date).startOf("day").toDate(),
          lt: dayjs.utc(date).add(1, "day").startOf("day").toDate(),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalDue = toNumber(all._sum.dueAmount);
  const totalCollected = toNumber(collectedOnDate._sum.amount);

  return {
    totalCustomers: all._count,
    totalDue,
    totalCollected,
    totalCollectedCount: collectedOnDate._count,
    pendingCollection: Math.max(totalDue - totalCollected, 0),
    counts: {
      pending: pending._count,
      paid: paid._count,
      partial: partial._count,
      missed: missed._count,
    },
  };
}

/**
 * Record a payment with full transactional safety.
 * - Idempotent via `clientRef` (for offline mobile retries)
 * - Locks LoanAccount and updates schedule + account atomically
 * - Applies amount to earliest unpaid installments first if no schedule specified
 */
export async function recordPayment(params: {
  user: CurrentUser;
  loanAccountId: string;
  scheduleId?: string;
  amount: number;
  penalty?: number;
  mode: PaymentMode;
  note?: string;
  geoLat?: number;
  geoLng?: number;
  clientRef?: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  // Idempotency — if clientRef already exists, return the prior payment
  if (params.clientRef) {
    const existing = await prisma.payment.findUnique({
      where: { clientRef: params.clientRef },
    });
    if (existing) {
      return { payment: existing, duplicate: true };
    }
  }

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loanAccount.findFirst({
      where: { id: params.loanAccountId, ...loanScopeWhere(params.user) },
      include: { schedule: { orderBy: { installmentNo: "asc" } } },
    });
    if (!loan) throw new Error("Loan not found");
    if (loan.status === "CLOSED" || loan.status === "WRITTEN_OFF") {
      throw new Error("Loan is closed");
    }

    // Distribute the payment across schedule rows (earliest unpaid first)
    let remaining = Math.round(params.amount * 100) / 100;
    const updates: { id: string; addPaid: number; fullyPaid: boolean }[] = [];

    if (params.scheduleId) {
      // Apply to specific schedule
      const target = loan.schedule.find((s) => s.id === params.scheduleId);
      if (!target) throw new Error("Schedule row not found");
      const outstanding = toNumber(target.dueAmount) - toNumber(target.paidAmount);
      const apply = Math.min(remaining, outstanding);
      updates.push({
        id: target.id,
        addPaid: apply,
        fullyPaid: apply >= outstanding - 0.009,
      });
      remaining -= apply;
    }

    // Any remaining: apply to earliest unpaid rows
    if (remaining > 0) {
      for (const s of loan.schedule) {
        if (remaining <= 0) break;
        if (updates.some((u) => u.id === s.id)) continue;
        if (s.status === "PAID") continue;
        const outstanding = toNumber(s.dueAmount) - toNumber(s.paidAmount);
        if (outstanding <= 0) continue;
        const apply = Math.min(remaining, outstanding);
        updates.push({
          id: s.id,
          addPaid: apply,
          fullyPaid: apply >= outstanding - 0.009,
        });
        remaining -= apply;
      }
    }

    // Apply schedule updates
    for (const u of updates) {
      const existing = loan.schedule.find((s) => s.id === u.id)!;
      const newPaid = toNumber(existing.paidAmount) + u.addPaid;
      const isFull = u.fullyPaid;
      await tx.repaymentSchedule.update({
        where: { id: u.id },
        data: {
          paidAmount: newPaid,
          status: isFull ? "PAID" : "PARTIAL",
          paidAt: isFull ? new Date() : existing.paidAt,
        },
      });
    }

    // Update loan account
    const newPaid = toNumber(loan.paidAmount) + params.amount;
    const newPending = Math.max(toNumber(loan.totalPayable) - newPaid, 0);

    // Recompute nextDueDate = earliest unpaid schedule dueDate
    const nextUnpaid = await tx.repaymentSchedule.findFirst({
      where: { loanAccountId: loan.id, status: { in: ["PENDING", "PARTIAL", "MISSED"] } },
      orderBy: { dueDate: "asc" },
    });

    // Determine correct loan status after payment
    let status: "ACTIVE" | "CLOSED" | "OVERDUE";
    if (newPending <= 0.009) {
      status = "CLOSED";
    } else {
      const today = toDateOnly(new Date());
      // Check if any installments remain past-due and unpaid
      const hasOverdue = loan.schedule.some((s) => {
        const update = updates.find((u) => u.id === s.id);
        if (update?.fullyPaid) return false;
        if (s.status === "PAID" || s.status === "SKIPPED") return false;
        return s.dueDate < today;
      });
      status = hasOverdue ? "OVERDUE" : "ACTIVE";
    }

    await tx.loanAccount.update({
      where: { id: loan.id },
      data: {
        paidAmount: newPaid,
        pendingAmount: newPending,
        nextDueDate: nextUnpaid?.dueDate ?? null,
        penaltyAmount: toNumber(loan.penaltyAmount) + (params.penalty ?? 0),
        status,
        closedAt: status === "CLOSED" ? new Date() : null,
      },
    });

    const receiptNo = await nextReceiptNo(tx);
    const payment = await tx.payment.create({
      data: {
        receiptNo,
        loanAccountId: loan.id,
        scheduleId: params.scheduleId,
        amount: params.amount,
        penalty: params.penalty ?? 0,
        mode: params.mode,
        collectedById: params.user.id,
        note: params.note,
        geoLat: params.geoLat,
        geoLng: params.geoLng,
        clientRef: params.clientRef,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.user.id,
        action: "PAYMENT_COLLECTED",
        entityType: "Payment",
        entityId: payment.id,
        after: {
          receiptNo,
          loanAccountId: loan.id,
          amount: params.amount,
          mode: params.mode,
        },
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return { payment, duplicate: false };
  });
}

/**
 * Mark past-due PENDING installments as MISSED, and their parent loans as OVERDUE.
 * Designed to run once per day — idempotent and safe to call concurrently.
 */
export async function markOverdueInstallments() {
  const today = toDateOnly(new Date());

  // Batch-mark past-due PENDING installments → MISSED
  await prisma.repaymentSchedule.updateMany({
    where: {
      dueDate: { lt: today },
      status: "PENDING",
    },
    data: { status: "MISSED" },
  });

  // Find ACTIVE loans that now have MISSED installments
  const overdueLoanIds = await prisma.loanAccount.findMany({
    where: {
      status: "ACTIVE",
      schedule: { some: { status: "MISSED" } },
    },
    select: { id: true },
  });

  // Update each loan: set OVERDUE + compute overdueAmount
  for (const { id } of overdueLoanIds) {
    const agg = await prisma.repaymentSchedule.aggregate({
      where: { loanAccountId: id, status: { in: ["MISSED", "PARTIAL"] }, dueDate: { lt: today } },
      _sum: { dueAmount: true, paidAmount: true },
    });
    const overdueAmount = Math.max(
      toNumber(agg._sum.dueAmount) - toNumber(agg._sum.paidAmount),
      0
    );
    await prisma.loanAccount.update({
      where: { id },
      data: { status: "OVERDUE", overdueAmount },
    });
  }
}

/** In-memory guard so markOverdueInstallments runs at most once per calendar day. */
let _lastOverdueCheck: string | null = null;

export async function ensureOverdueMarked() {
  const today = new Date().toISOString().slice(0, 10);
  if (_lastOverdueCheck === today) return;
  try {
    await markOverdueInstallments();
    _lastOverdueCheck = today;
  } catch (e) {
    console.error("Failed to mark overdue installments:", e);
  }
}
