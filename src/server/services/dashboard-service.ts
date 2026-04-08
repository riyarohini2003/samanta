import { prisma } from "@/server/db";
import dayjs from "@/lib/dayjs";
import { toDateOnly } from "@/lib/dayjs";
import { toNumber } from "@/lib/formatters";
import type { Prisma } from "@prisma/client";

/**
 * Loan status distribution for pie chart.
 * Returns count per status across all (or scoped) loans.
 */
export async function getLoanStatusDistribution(
  where: Prisma.LoanAccountWhereInput = {}
) {
  const statuses = ["ACTIVE", "CLOSED", "OVERDUE", "NPA", "WRITTEN_OFF"] as const;
  const counts = await Promise.all(
    statuses.map((status) =>
      prisma.loanAccount.count({ where: { ...where, status } })
    )
  );
  return statuses.map((name, i) => ({ name, value: counts[i] })).filter((d) => d.value > 0);
}

/**
 * Portfolio aging buckets for bar chart.
 */
export async function getPortfolioAging(
  where: Prisma.LoanAccountWhereInput = {}
) {
  const today = toDateOnly(new Date());
  const loans = await prisma.loanAccount.findMany({
    where: { ...where, status: { in: ["ACTIVE", "OVERDUE", "NPA"] } },
    include: {
      schedule: {
        where: { status: { in: ["MISSED", "PARTIAL"] }, dueDate: { lt: today } },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
  });

  const buckets = [
    { label: "Current", min: -Infinity, max: 0 },
    { label: "1-30 Days", min: 1, max: 30 },
    { label: "31-60 Days", min: 31, max: 60 },
    { label: "61-90 Days", min: 61, max: 90 },
    { label: "91-180 Days", min: 91, max: 180 },
    { label: "180+ Days", min: 181, max: Infinity },
  ];

  const result = buckets.map((b) => ({ bucket: b.label, count: 0, outstanding: 0 }));

  for (const loan of loans) {
    const earliestOverdue = loan.schedule[0]?.dueDate;
    const daysOverdue = earliestOverdue
      ? dayjs(today).diff(dayjs(earliestOverdue), "day")
      : 0;
    const outstanding = toNumber(loan.pendingAmount);

    const bucket = buckets.findIndex(
      (b) => daysOverdue >= b.min && daysOverdue <= b.max
    );
    const idx = bucket >= 0 ? bucket : 0;
    result[idx].count++;
    result[idx].outstanding += outstanding;
  }

  return result;
}

/**
 * Collection trend: daily collected vs due amounts for the last N days.
 */
export async function getCollectionTrend(
  days = 7,
  scope: Prisma.LoanAccountWhereInput = {}
) {
  const data: { date: string; collected: number; due: number }[] = [];
  const today = dayjs().startOf("day");

  for (let i = days - 1; i >= 0; i--) {
    const d = today.subtract(i, "day");
    const start = d.toDate();
    const end = d.add(1, "day").toDate();
    const label = d.format("DD MMM");

    const [collected, due] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          isReversed: false,
          collectedAt: { gte: start, lt: end },
          ...(Object.keys(scope).length > 0 ? { loanAccount: scope } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.repaymentSchedule.aggregate({
        where: {
          dueDate: { gte: start, lt: end },
          ...(Object.keys(scope).length > 0 ? { loanAccount: scope } : {}),
        },
        _sum: { dueAmount: true },
      }),
    ]);

    data.push({
      date: label,
      collected: toNumber(collected._sum.amount),
      due: toNumber(due._sum.dueAmount),
    });
  }

  return data;
}

/**
 * Branch-wise performance for grouped bar chart.
 */
export async function getBranchPerformance() {
  const branches = await prisma.branch.findMany({
    where: { deletedAt: { isSet: false }, isActive: true },
    select: { id: true, name: true, code: true },
  });

  const result = await Promise.all(
    branches.map(async (branch) => {
      const [disbursed, collected, outstanding] = await Promise.all([
        prisma.loanAccount.aggregate({
          where: { branchId: branch.id },
          _sum: { principal: true },
        }),
        prisma.payment.aggregate({
          where: { isReversed: false, loanAccount: { branchId: branch.id } },
          _sum: { amount: true },
        }),
        prisma.loanAccount.aggregate({
          where: { branchId: branch.id, status: { in: ["ACTIVE", "OVERDUE", "NPA"] } },
          _sum: { pendingAmount: true },
        }),
      ]);

      return {
        branch: branch.code,
        disbursed: toNumber(disbursed._sum.principal),
        collected: toNumber(collected._sum.amount),
        outstanding: toNumber(outstanding._sum.pendingAmount),
      };
    })
  );

  return result.filter((r) => r.disbursed > 0 || r.collected > 0 || r.outstanding > 0);
}
