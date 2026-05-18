import { prisma } from "@/server/db";
import dayjs from "@/lib/dayjs";
import { toDateOnly } from "@/lib/dayjs";
import type { Prisma, PaymentMode } from "@prisma/client";
import { nextReceiptNo } from "@/server/counters";
import { toNumber } from "@/lib/formatters";
import type { CurrentUser } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";
import { getLoanSerialMap } from "@/server/services/igl-serial";

/** Build a dueDate filter: range for DUE_ON, lte for DUE_UPTO, [from, to] for DUE_BETWEEN */
function dueDateFilter(
  date: Date,
  mode: "DUE_ON" | "DUE_UPTO" | "DUE_BETWEEN",
  dateTo?: Date
): Prisma.DateTimeFilter {
  if (mode === "DUE_UPTO") return { lte: dayjs.utc(date).endOf("day").toDate() };
  if (mode === "DUE_BETWEEN") {
    // If dateTo missing, fall back to single-day behavior
    const end = dateTo ?? date;
    return {
      gte: dayjs.utc(date).startOf("day").toDate(),
      lt: dayjs.utc(end).add(1, "day").startOf("day").toDate(),
    };
  }
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
  dateTo?: string; // YYYY-MM-DD (used when mode=DUE_BETWEEN)
  branchId?: string;
  employeeId?: string;
  loanType?: "DAILY" | "WEEKLY" | "MONTHLY";
  status?: "ALL" | "PENDING" | "PAID" | "PARTIAL" | "MISSED";
  q?: string;
  mode?: "DUE_ON" | "DUE_UPTO" | "DUE_BETWEEN";
}) {
  const date = toDateOnly(params.date);
  const dateTo = params.dateTo ? toDateOnly(params.dateTo) : undefined;
  const mode = params.mode ?? "DUE_ON";

  const loanWhere: Prisma.LoanAccountWhereInput = {
    ...loanScopeWhere(params.user),
    status: { in: ["ACTIVE", "OVERDUE", "CLOSED"] },
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

  const periodFilter = dueDateFilter(date, mode, dateTo);
  const scheduleWhere: Prisma.RepaymentScheduleWhereInput = {
    OR: [
      { dueDate: periodFilter },
      { paidAt: periodFilter },
    ],
    ...(params.status && params.status !== "ALL"
      ? { status: params.status as any }
      : { status: { not: "SKIPPED" } }),
    loanAccount: loanWhere,
  };

  const rows = await prisma.repaymentSchedule.findMany({
    where: scheduleWhere,
    include: {
      loanAccount: {
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
              mobile: true,
            },
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

  const serials = await getLoanSerialMap(rows.map((r) => r.loanAccountId));
  return rows.map((r) => ({ ...r, iglSerial: serials.get(r.loanAccountId) ?? 0 }));
}

/** Summary aggregate for dashboard cards. */
export async function getDueSummary(params: {
  user: CurrentUser;
  date: string;
  dateTo?: string;
  branchId?: string;
  employeeId?: string;
  loanType?: "DAILY" | "WEEKLY" | "MONTHLY";
  status?: "ALL" | "PENDING" | "PAID" | "PARTIAL" | "MISSED";
  q?: string;
  mode?: "DUE_ON" | "DUE_UPTO" | "DUE_BETWEEN";
}) {
  const date = toDateOnly(params.date);
  const dateTo = params.dateTo ? toDateOnly(params.dateTo) : undefined;
  const mode = params.mode ?? "DUE_ON";

  const loanWhere: Prisma.LoanAccountWhereInput = {
    ...loanScopeWhere(params.user),
    status: { in: ["ACTIVE", "OVERDUE", "CLOSED"] },
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
      : { status: { not: "SKIPPED" } };

  const periodFilter = dueDateFilter(date, mode, dateTo);
  const periodOr: Prisma.RepaymentScheduleWhereInput[] = [
    { dueDate: periodFilter },
    { paidAt: periodFilter },
  ];

  const where: Prisma.RepaymentScheduleWhereInput = {
    OR: periodOr,
    ...statusFilter,
    loanAccount: loanWhere,
  };

  // For "ALL" or no specific status, we need per-status counts from within the filtered set
  const baseWhere: Prisma.RepaymentScheduleWhereInput = {
    OR: periodOr,
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

  // Schedule IDs for every installment in the listed period (any status), so we
  // can scope "collected from listed data" to payments tied to these rows only.
  const periodScheduleRows = await prisma.repaymentSchedule.findMany({
    where: baseWhere,
    select: { id: true },
  });
  const periodScheduleIds = periodScheduleRows.map((s) => s.id);

  const [all, paid, partial, missed, pending, collectedOnDate, collectedOnListed, totalDueAgg] = await Promise.all([
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
    // Actual collections made within the selected period (by collectedAt, not dueDate)
    prisma.payment.aggregate({
      where: {
        ...paymentScopeWhere,
        collectedAt: {
          gte: dayjs.utc(date).startOf("day").toDate(),
          lt: dayjs.utc(mode === "DUE_BETWEEN" && dateTo ? dateTo : date).add(1, "day").startOf("day").toDate(),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // Collections within the period that were applied to schedule rows belonging
    // to the listed period — used to deduct from pending without leaking
    // payments made against installments outside the current view.
    prisma.payment.aggregate({
      where: {
        ...paymentScopeWhere,
        collectedAt: {
          gte: dayjs.utc(date).startOf("day").toDate(),
          lt: dayjs.utc(mode === "DUE_BETWEEN" && dateTo ? dateTo : date).add(1, "day").startOf("day").toDate(),
        },
        scheduleId: { in: periodScheduleIds },
      },
      _sum: { amount: true },
    }),
    // Total Due = gross sum of every installment's dueAmount in the period,
    // regardless of payment status (PAID rows included). SKIPPED is excluded.
    prisma.repaymentSchedule.aggregate({
      where: { ...baseWhere, status: { not: "SKIPPED" } },
      _sum: { dueAmount: true },
      _count: true,
    }),
  ]);

  const totalDue = toNumber(totalDueAgg._sum.dueAmount);
  const totalCollected = toNumber(collectedOnDate._sum.amount);
  const totalCollectedOnListed = toNumber(collectedOnListed._sum.amount);

  return {
    totalCustomers: all._count,
    totalDue,
    totalCollected,
    totalCollectedCount: collectedOnDate._count,
    // Pending = total due for the listed period minus collections applied to
    // those listed rows within the period.
    pendingCollection: Math.max(totalDue - totalCollectedOnListed, 0),
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
 * Edit an existing payment. Updates the payment row, then rebuilds the parent
 * loan's schedule + totals + status by replaying every non-reversed payment
 * chronologically — this keeps state consistent even when the original payment
 * was distributed across multiple installments.
 */
export async function updatePayment(params: {
  user: CurrentUser;
  paymentId: string;
  amount: number;
  penalty: number;
  mode: PaymentMode;
  note?: string | null;
  collectedAt?: Date;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id: params.paymentId },
        include: { loanAccount: true },
      });
      if (!existing) throw new Error("Payment not found");

      const loan = await tx.loanAccount.findFirst({
        where: { id: existing.loanAccountId, ...loanScopeWhere(params.user) },
      });
      if (!loan) throw new Error("Loan not found");

      const before = {
        amount: toNumber(existing.amount),
        penalty: toNumber(existing.penalty),
        mode: existing.mode,
        note: existing.note,
        collectedAt: existing.collectedAt,
      };

      const updated = await tx.payment.update({
        where: { id: existing.id },
        data: {
          amount: params.amount,
          penalty: params.penalty,
          mode: params.mode,
          note: params.note ?? null,
          collectedAt: params.collectedAt ?? existing.collectedAt,
        },
      });

      await rebuildLoanState(tx, loan.id);

      await tx.auditLog.create({
        data: {
          userId: params.user.id,
          action: "PAYMENT_EDITED",
          entityType: "Payment",
          entityId: existing.id,
          before,
          after: {
            amount: params.amount,
            penalty: params.penalty,
            mode: params.mode,
            note: params.note ?? null,
            collectedAt: params.collectedAt ?? existing.collectedAt,
          },
          ip: params.ip ?? null,
          userAgent: params.userAgent ?? null,
        },
      });

      return updated;
    },
    { maxWait: 10_000, timeout: 60_000 }
  );
}

/**
 * Recompute the entire loan's schedule + totals + status from the canonical
 * list of non-reversed payments. Used after editing a payment so distributions
 * across multiple installments stay correct.
 */
async function rebuildLoanState(
  tx: Prisma.TransactionClient,
  loanAccountId: string
) {
  const loan = await tx.loanAccount.findUnique({
    where: { id: loanAccountId },
    include: {
      schedule: { orderBy: { installmentNo: "asc" } },
      payments: { where: { isReversed: false }, orderBy: { collectedAt: "asc" } },
    },
  });
  if (!loan) throw new Error("Loan not found");

  // Reset schedule rows (preserve SKIPPED)
  const today = toDateOnly(new Date());
  const scheduleState = loan.schedule.map((s) => ({
    id: s.id,
    dueDate: s.dueDate,
    dueAmount: toNumber(s.dueAmount),
    paidAmount: 0,
    status: s.status === "SKIPPED" ? "SKIPPED" : "PENDING",
    paidAt: null as Date | null,
  }));

  // Replay payments chronologically using the same distribution rules as recordPayment
  let totalPaid = 0;
  let totalPenalty = 0;
  for (const p of loan.payments) {
    let remaining = Math.round(toNumber(p.amount) * 100) / 100;
    totalPaid += toNumber(p.amount);
    totalPenalty += toNumber(p.penalty);

    const applyTo = (row: (typeof scheduleState)[number]) => {
      if (row.status === "SKIPPED" || row.status === "PAID") return;
      const outstanding = row.dueAmount - row.paidAmount;
      if (outstanding <= 0) return;
      const apply = Math.min(remaining, outstanding);
      row.paidAmount += apply;
      remaining -= apply;
      if (row.paidAmount >= row.dueAmount - 0.009) {
        row.status = "PAID";
        row.paidAt = p.collectedAt;
      } else {
        row.status = "PARTIAL";
      }
    };

    if (p.scheduleId) {
      const target = scheduleState.find((s) => s.id === p.scheduleId);
      if (target) applyTo(target);
    }
    for (const s of scheduleState) {
      if (remaining <= 0) break;
      if (s.id === p.scheduleId) continue;
      applyTo(s);
    }
  }

  // Mark remaining unpaid installments past today as MISSED
  for (const s of scheduleState) {
    if (s.status === "PENDING" && s.dueDate < today) {
      s.status = "MISSED";
    }
  }

  // Persist schedule changes (parallel writes to keep the transaction short)
  const originalById = new Map(loan.schedule.map((o) => [o.id, o] as const));
  const dirty = scheduleState.filter((s) => {
    const original = originalById.get(s.id)!;
    return (
      toNumber(original.paidAmount) !== s.paidAmount ||
      original.status !== s.status ||
      (original.paidAt?.getTime() ?? null) !== (s.paidAt?.getTime() ?? null)
    );
  });
  await Promise.all(
    dirty.map((s) =>
      tx.repaymentSchedule.update({
        where: { id: s.id },
        data: {
          paidAmount: s.paidAmount,
          status: s.status as any,
          paidAt: s.paidAt,
        },
      })
    )
  );

  const newPending = Math.max(toNumber(loan.totalPayable) - totalPaid, 0);
  const nextUnpaid = scheduleState
    .filter((s) => s.status === "PENDING" || s.status === "PARTIAL" || s.status === "MISSED")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

  // Recompute overdue amount from current schedule state
  const overdueAmount = scheduleState.reduce((sum, s) => {
    if ((s.status === "MISSED" || s.status === "PARTIAL") && s.dueDate < today) {
      return sum + Math.max(s.dueAmount - s.paidAmount, 0);
    }
    return sum;
  }, 0);

  let status: "ACTIVE" | "CLOSED" | "OVERDUE";
  if (newPending <= 0.009) {
    status = "CLOSED";
  } else if (overdueAmount > 0) {
    status = "OVERDUE";
  } else {
    status = "ACTIVE";
  }

  // Preserve manual closures (WRITTEN_OFF) and the existing closedAt if already closed
  const preservedStatus =
    loan.status === "WRITTEN_OFF" ? "WRITTEN_OFF" : status;

  await tx.loanAccount.update({
    where: { id: loan.id },
    data: {
      paidAmount: totalPaid,
      pendingAmount: newPending,
      penaltyAmount: totalPenalty,
      overdueAmount,
      nextDueDate: nextUnpaid?.dueDate ?? null,
      status: preservedStatus,
      closedAt:
        preservedStatus === "CLOSED"
          ? loan.closedAt ?? new Date()
          : preservedStatus === "WRITTEN_OFF"
          ? loan.closedAt
          : null,
    },
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
