import { prisma } from "@/server/db";
import dayjs from "@/lib/dayjs";
import { toDateOnly } from "@/lib/dayjs";
import { getSetting } from "@/server/settings";
import { toNumber } from "@/lib/formatters";

/**
 * Calculates and applies penalty charges on overdue repayment schedule rows.
 *
 * Penalties start accruing after `graceDays` past the due date and are charged
 * at a flat `defaultPenaltyPerDay` rate (both configurable in Loan Policy settings).
 *
 * After individual schedule rows are updated, the parent loan account's
 * `penaltyAmount` is recomputed as the sum of all its schedule penalties.
 */
export async function calculateAndApplyPenalties(): Promise<{
  updated: number;
  totalPenalty: number;
}> {
  const policy = await getSetting("loanPolicy");
  const { graceDays, defaultPenaltyPerDay } = policy;

  const today = toDateOnly(new Date());
  const cutoffDate = dayjs(today).subtract(graceDays, "day").toDate();

  // Find all overdue schedule rows past the grace period on active/overdue/NPA loans
  const overdueSchedules = await prisma.repaymentSchedule.findMany({
    where: {
      status: { in: ["MISSED", "PARTIAL"] },
      dueDate: { lt: cutoffDate },
      loanAccount: {
        status: { in: ["ACTIVE", "OVERDUE", "NPA"] },
      },
    },
    select: {
      id: true,
      dueDate: true,
      penaltyAmount: true,
      loanAccountId: true,
    },
  });

  let updated = 0;
  let totalPenalty = 0;
  const affectedLoanIds = new Set<string>();

  for (const schedule of overdueSchedules) {
    const daysOverdue =
      dayjs(today).diff(dayjs(schedule.dueDate), "day") - graceDays;

    if (daysOverdue <= 0) continue;

    const penalty = daysOverdue * defaultPenaltyPerDay;
    totalPenalty += penalty;
    affectedLoanIds.add(schedule.loanAccountId);

    // Only write if the penalty actually changed
    if (toNumber(schedule.penaltyAmount) !== penalty) {
      await prisma.repaymentSchedule.update({
        where: { id: schedule.id },
        data: { penaltyAmount: penalty },
      });
      updated++;
    }
  }

  // Recompute each affected loan's total penalty from all its schedule rows
  for (const loanId of affectedLoanIds) {
    const result = await prisma.repaymentSchedule.aggregate({
      where: { loanAccountId: loanId },
      _sum: { penaltyAmount: true },
    });

    const loanTotalPenalty = toNumber(result._sum.penaltyAmount);

    await prisma.loanAccount.update({
      where: { id: loanId },
      data: { penaltyAmount: loanTotalPenalty },
    });
  }

  return { updated, totalPenalty };
}

/**
 * Returns the current penalty amount for a single schedule entry based on
 * how many days it is overdue (past the grace period).
 *
 * Useful for showing real-time penalty info in the collection UI without
 * waiting for the cron job.
 */
export async function getPenaltyForSchedule(
  dueDate: Date,
  _dueAmount: number,
  _paidAmount: number
): Promise<number> {
  const policy = await getSetting("loanPolicy");
  const { graceDays, defaultPenaltyPerDay } = policy;

  const today = toDateOnly(new Date());
  const daysOverdue = dayjs(today).diff(dayjs(dueDate), "day") - graceDays;

  if (daysOverdue <= 0) return 0;

  return daysOverdue * defaultPenaltyPerDay;
}
