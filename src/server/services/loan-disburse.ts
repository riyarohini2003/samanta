import { prisma } from "@/server/db";
import type { DisbursementMode } from "@prisma/client";
import { buildScheduleRows } from "./schedule-generator";
import { addUnits } from "./loan-calculator";
import { nextLoanAccountNo } from "@/server/counters";
import { toNumber } from "@/lib/formatters";
import dayjs from "@/lib/dayjs";

export async function disburseApplication(params: {
  applicationId: string;
  assignedEmployeeId: string;
  disbursementMode: DisbursementMode;
  disbursedAt?: Date;
  firstDueDate?: Date;
  actorUserId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.loanApplication.findUnique({
      where: { id: params.applicationId },
      include: { customer: true },
    });
    if (!app) throw new Error("Application not found");
    if (app.status !== "APPROVED") throw new Error("Application is not APPROVED");

    const existing = await tx.loanAccount.findUnique({
      where: { applicationId: app.id },
    });
    if (existing) throw new Error("Loan already disbursed for this application");

    const accountNo = await nextLoanAccountNo(tx);
    const disbursedAt = params.disbursedAt ?? new Date();

    // Schedule starts on the admin-selected first collection date, or
    // falls back to the disbursement date when none is provided.
    const scheduleStart = params.firstDueDate ?? disbursedAt;
    const startDate = dayjs.utc(scheduleStart).startOf("day").toDate();
    if (startDate < dayjs.utc(disbursedAt).startOf("day").toDate()) {
      throw new Error("First collection date cannot be before the disbursement date");
    }
    const maturityDate = addUnits(
      dayjs.utc(startDate),
      app.loanType,
      app.tenureCount - 1,
    ).toDate();

    const account = await tx.loanAccount.create({
      data: {
        accountNo,
        applicationId: app.id,
        customerId: app.customerId,
        branchId: app.branchId,
        assignedEmployeeId: params.assignedEmployeeId,
        loanType: app.loanType,
        principal: app.principal,
        interestAmount: app.interestAmount,
        processingFee: app.processingFee,
        totalPayable: app.totalPayable,
        installmentAmount: app.installmentAmount,
        pendingAmount: app.totalPayable,
        disbursedAt,
        disbursementMode: params.disbursementMode,
        startDate,
        maturityDate,
        nextDueDate: startDate,
      },
    });

    const rows = buildScheduleRows({
      loanAccountId: account.id,
      loanType: app.loanType,
      startDate,
      tenureCount: app.tenureCount,
      installmentAmount: toNumber(app.installmentAmount),
      totalPayable: toNumber(app.totalPayable),
    });
    await tx.repaymentSchedule.createMany({ data: rows });

    // Update application with actual start/maturity dates and mark as disbursed
    await tx.loanApplication.update({
      where: { id: app.id },
      data: {
        status: "DISBURSED",
        startDate,
        maturityDate,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorUserId,
        action: "LOAN_DISBURSED",
        entityType: "LoanAccount",
        entityId: account.id,
        after: { accountNo, applicationId: app.id },
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    return account;
  });
}
