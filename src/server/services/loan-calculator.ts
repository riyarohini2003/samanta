import dayjs from "@/lib/dayjs";
import type { LoanType } from "@prisma/client";

export type InterestMethod = "SIMPLE" | "COMPOUND";
export type RatePeriod = "WEEKLY" | "MONTHLY" | "ANNUAL";

export type LoanCalcInput = {
  principal: number;
  interestRate: number; // rate expressed in the ratePeriod (defaults to annual %)
  tenureCount: number;
  loanType: LoanType; // also serves as the tenure unit (DAILY=days, WEEKLY=weeks, MONTHLY=months)
  processingFee?: number;
  startDate: string | Date;
  interestMethod?: InterestMethod; // default: SIMPLE
  ratePeriod?: RatePeriod; // default: ANNUAL
};

export type LoanCalcResult = {
  principal: number;
  interestAmount: number;
  processingFee: number;
  totalPayable: number;
  installmentAmount: number;
  startDate: Date;
  maturityDate: Date;
  tenureCount: number;
  loanType: LoanType;
  interestMethod: InterestMethod;
  ratePeriod: RatePeriod;
  effectiveAnnualRate: number;
};

/**
 * Loan calculator supporting simple and compound interest.
 *
 * Rate is interpreted per `ratePeriod` (WEEKLY / MONTHLY / ANNUAL) and is
 * normalized to an effective annual rate before any calculation:
 *   WEEKLY  → annual = rate × 52
 *   MONTHLY → annual = rate × 12
 *   ANNUAL  → annual = rate
 *
 * Tenure in years depends on `loanType` + `tenureCount`:
 *   DAILY:   tenureCount days   → tenureCount / 365
 *   WEEKLY:  tenureCount weeks  → tenureCount * 7 / 365
 *   MONTHLY: tenureCount months → tenureCount / 12
 *
 * SIMPLE   → interest = P × r × t
 * COMPOUND → totalPayable = P × (1 + r/n)^(n·t), with n = compoundings/year
 *            inferred from loanType (DAILY=365, WEEKLY=52, MONTHLY=12)
 */
export function calculateLoan(input: LoanCalcInput): LoanCalcResult {
  const principal = round2(input.principal);
  const processingFee = round2(input.processingFee ?? 0);
  const method: InterestMethod = input.interestMethod ?? "SIMPLE";
  const ratePeriod: RatePeriod = input.ratePeriod ?? "ANNUAL";

  const annualRate =
    ratePeriod === "WEEKLY"
      ? input.interestRate * 52
      : ratePeriod === "MONTHLY"
      ? input.interestRate * 12
      : input.interestRate;
  const r = annualRate / 100;

  const tenureYears =
    input.loanType === "DAILY"
      ? input.tenureCount / 365
      : input.loanType === "WEEKLY"
      ? (input.tenureCount * 7) / 365
      : input.tenureCount / 12;

  let interestAmount: number;
  if (method === "COMPOUND") {
    const n = input.loanType === "DAILY" ? 365 : input.loanType === "WEEKLY" ? 52 : 12;
    const total = principal * Math.pow(1 + r / n, n * tenureYears);
    interestAmount = round2(total - principal);
  } else {
    interestAmount = round2(principal * r * tenureYears);
  }

  const totalPayable = Math.round(principal + interestAmount);
  const installmentAmount = Math.round(totalPayable / input.tenureCount);

  const startDate = dayjs(input.startDate).startOf("day");
  const maturityDate = addUnits(startDate, input.loanType, input.tenureCount - 1);

  return {
    principal,
    interestAmount,
    processingFee,
    totalPayable,
    installmentAmount,
    startDate: startDate.toDate(),
    maturityDate: maturityDate.toDate(),
    tenureCount: input.tenureCount,
    loanType: input.loanType,
    interestMethod: method,
    ratePeriod,
    effectiveAnnualRate: round2(annualRate),
  };
}

export function addUnits(d: dayjs.Dayjs, type: LoanType, n: number): dayjs.Dayjs {
  switch (type) {
    case "DAILY":
      return d.add(n, "day");
    case "WEEKLY":
      return d.add(n, "week");
    case "MONTHLY":
      return d.add(n, "month");
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
