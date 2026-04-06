/**
 * Nightly cron: marks missed installments and updates loan statuses.
 * Run via: npm run cron:overdue
 * Schedule via Hostinger cron (daily at 00:15):
 *   15 0 * * * cd /path/to/app && npm run cron:overdue
 */
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";

const prisma = new PrismaClient();
const OVERDUE_DAYS = Number(process.env.OVERDUE_THRESHOLD_DAYS || 1);
const NPA_DAYS = Number(process.env.NPA_THRESHOLD_DAYS || 90);

async function main() {
  const today = dayjs().startOf("day").toDate();
  console.log(`[cron] overdue job starting at ${new Date().toISOString()}`);

  // Mark PENDING rows whose dueDate < today as MISSED
  const missedResult = await prisma.repaymentSchedule.updateMany({
    where: {
      dueDate: { lt: today },
      status: "PENDING",
    },
    data: { status: "MISSED" },
  });
  console.log(`[cron] marked ${missedResult.count} installments as MISSED`);

  // Recompute overdue amounts for active loans
  const loans = await prisma.loanAccount.findMany({
    where: { status: { in: ["ACTIVE", "OVERDUE"] } },
    include: {
      schedule: {
        where: {
          dueDate: { lt: today },
          status: { in: ["MISSED", "PARTIAL"] },
        },
      },
    },
  });

  let overdueCount = 0;
  let npaCount = 0;
  for (const loan of loans) {
    let overdue = 0;
    let earliestOverdue: Date | null = null;
    for (const s of loan.schedule) {
      const diff = Number(s.dueAmount) - Number(s.paidAmount);
      if (diff > 0) {
        overdue += diff;
        if (!earliestOverdue || s.dueDate < earliestOverdue) earliestOverdue = s.dueDate;
      }
    }

    let status: "ACTIVE" | "OVERDUE" | "NPA" = "ACTIVE";
    if (overdue > 0 && earliestOverdue) {
      const daysOverdue = dayjs(today).diff(earliestOverdue, "day");
      if (daysOverdue >= NPA_DAYS) status = "NPA";
      else if (daysOverdue >= OVERDUE_DAYS) status = "OVERDUE";
    }

    await prisma.loanAccount.update({
      where: { id: loan.id },
      data: { overdueAmount: overdue, status },
    });
    if (status === "OVERDUE") overdueCount++;
    if (status === "NPA") npaCount++;
  }

  console.log(`[cron] marked ${overdueCount} loans OVERDUE, ${npaCount} NPA`);
  console.log(`[cron] done at ${new Date().toISOString()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
