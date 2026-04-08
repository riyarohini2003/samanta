import { prisma } from "@/server/db";
import { toNumber } from "@/lib/formatters";
import type { CurrentUser } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";

/**
 * Normal loan closure: all installments have been paid.
 * Verifies pendingAmount is effectively zero, then marks the loan as CLOSED.
 */
export async function closeLoan(params: {
  user: CurrentUser;
  loanAccountId: string;
  actorUserId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.loanAccountId, ...loanScopeWhere(params.user) },
  });
  if (!loan) throw new Error("Loan not found");
  if (loan.status === "CLOSED" || loan.status === "WRITTEN_OFF") {
    throw new Error("Loan is already closed");
  }

  const pending = toNumber(loan.pendingAmount);
  if (pending > 0.009) {
    throw new Error("Loan still has outstanding balance; cannot close");
  }

  return prisma.$transaction(async (tx) => {
    // Mark any remaining unpaid schedules as PAID with paidAmount = dueAmount
    const unpaidRows = await tx.repaymentSchedule.findMany({
      where: {
        loanAccountId: loan.id,
        status: { in: ["PENDING", "PARTIAL", "MISSED"] },
      },
    });
    for (const row of unpaidRows) {
      await tx.repaymentSchedule.update({
        where: { id: row.id },
        data: {
          status: "PAID",
          paidAmount: row.dueAmount,
          paidAt: new Date(),
        },
      });
    }

    const updated = await tx.loanAccount.update({
      where: { id: loan.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        pendingAmount: 0,
        nextDueDate: null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        action: "LOAN_CLOSED",
        entityType: "LoanAccount",
        entityId: loan.id,
        before: { status: loan.status, pendingAmount: toNumber(loan.pendingAmount) },
        after: { status: "CLOSED", closedAt: new Date() },
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return updated;
  });
}

/**
 * Pre-closure / foreclosure: settle remaining balance with an optional waiver.
 * The caller must have already collected any outstanding amount; the waiverAmount
 * covers the gap between paidAmount and totalPayable.
 */
export async function preCloseLoan(params: {
  user: CurrentUser;
  loanAccountId: string;
  waiverAmount?: number;
  actorUserId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.loanAccountId, ...loanScopeWhere(params.user) },
  });
  if (!loan) throw new Error("Loan not found");
  if (!["ACTIVE", "OVERDUE", "NPA"].includes(loan.status)) {
    throw new Error(`Cannot pre-close a loan with status ${loan.status}`);
  }

  const pending = toNumber(loan.pendingAmount);
  const waiver = params.waiverAmount ?? 0;
  const outstandingAmount = pending - waiver;

  if (outstandingAmount > 0.009) {
    throw new Error("Outstanding amount must be paid before closure");
  }

  return prisma.$transaction(async (tx) => {
    // Mark all unpaid schedule rows as SKIPPED
    await tx.repaymentSchedule.updateMany({
      where: {
        loanAccountId: loan.id,
        status: { in: ["PENDING", "PARTIAL", "MISSED"] },
      },
      data: { status: "SKIPPED" },
    });

    const updated = await tx.loanAccount.update({
      where: { id: loan.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        pendingAmount: 0,
        nextDueDate: null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        action: "LOAN_PRE_CLOSED",
        entityType: "LoanAccount",
        entityId: loan.id,
        before: {
          status: loan.status,
          pendingAmount: toNumber(loan.pendingAmount),
          paidAmount: toNumber(loan.paidAmount),
        },
        after: {
          status: "CLOSED",
          closedAt: new Date(),
          waiverAmount: waiver,
        },
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return updated;
  });
}
