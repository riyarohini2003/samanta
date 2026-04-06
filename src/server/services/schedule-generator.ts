import type { Prisma, LoanType } from "@prisma/client";
import dayjs from "@/lib/dayjs";
import { addUnits } from "./loan-calculator";

/**
 * Generate the full repayment schedule rows for a loan account.
 * Due to rounding, the LAST installment absorbs the remainder so the
 * sum of dueAmount == totalPayable exactly.
 */
export function buildScheduleRows(params: {
  loanAccountId: string;
  loanType: LoanType;
  startDate: Date;
  tenureCount: number;
  installmentAmount: number; // rounded
  totalPayable: number;      // rounded
}): Prisma.RepaymentScheduleCreateManyInput[] {
  const rows: Prisma.RepaymentScheduleCreateManyInput[] = [];
  const start = dayjs.utc(params.startDate).startOf("day");

  const normal = Math.round(params.installmentAmount);
  const total = Math.round(params.totalPayable);
  const lastAmount = total - normal * (params.tenureCount - 1);

  for (let i = 1; i <= params.tenureCount; i++) {
    const dueDate = addUnits(start, params.loanType, i - 1).toDate();
    const amount = i === params.tenureCount ? lastAmount : normal;
    rows.push({
      loanAccountId: params.loanAccountId,
      installmentNo: i,
      dueDate,
      dueAmount: amount,
    });
  }
  return rows;
}
