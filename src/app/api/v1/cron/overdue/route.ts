import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import dayjs from "dayjs";

const OVERDUE_DAYS = Number(process.env.OVERDUE_THRESHOLD_DAYS || 1);
const NPA_DAYS = Number(process.env.NPA_THRESHOLD_DAYS || 90);

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = dayjs().startOf("day").toDate();

  // Mark PENDING rows whose dueDate < today as MISSED
  const missedResult = await prisma.repaymentSchedule.updateMany({
    where: {
      dueDate: { lt: today },
      status: "PENDING",
    },
    data: { status: "MISSED" },
  });

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
        if (!earliestOverdue || s.dueDate < earliestOverdue)
          earliestOverdue = s.dueDate;
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

  return NextResponse.json({
    ok: true,
    missed: missedResult.count,
    overdue: overdueCount,
    npa: npaCount,
  });
}
