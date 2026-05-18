import dayjs from "@/lib/dayjs";
import type { CustomPayoutRow } from "@/lib/zod-schemas/investment";

export type PayoutMode = "MONTHLY_INTEREST" | "MONTHLY_EMI" | "CUSTOM";

export type GeneratedPayout = {
  payoutNo: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  totalDue: number;
};

export type InvestmentCalcResult = {
  payouts: GeneratedPayout[];
  interestAmount: number; // total interest over the tenure
  totalReturn: number;    // principal + total interest
  maturityDate: Date;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build the payout schedule + interest/return totals for an investment.
 *
 * - MONTHLY_INTEREST: each month investor receives P * R / 1200 as interest; on the final
 *   month principal is also returned.  Total interest = P * R/100 * tenureMonths/12.
 * - MONTHLY_EMI: standard amortization formula on monthly compounding.  Each row carries a
 *   split of principal + interest.  Total interest = sum(emi) - P.
 * - CUSTOM: caller supplies an explicit schedule; we just normalize + total it up.
 *   Maturity date defaults to investmentDate + tenureMonths but is overridden by the last
 *   row's dueDate when supplied (so admin can extend or compress the schedule).
 */
export function buildInvestmentSchedule(args: {
  principalAmount: number;
  interestRate: number; // annual %
  tenureMonths: number;
  investmentDate: Date;
  payoutMode: PayoutMode;
  customPayouts?: CustomPayoutRow[];
}): InvestmentCalcResult {
  const { principalAmount, interestRate, tenureMonths, investmentDate, payoutMode } = args;
  const start = dayjs.utc(investmentDate).startOf("day");
  const fallbackMaturity = start.add(tenureMonths, "month").toDate();

  if (payoutMode === "CUSTOM") {
    const rows = (args.customPayouts ?? [])
      .map((r, i) => ({
        payoutNo: i + 1,
        dueDate: dayjs.utc(r.dueDate).startOf("day").toDate(),
        principalDue: round2(r.principalDue ?? 0),
        interestDue: round2(r.interestDue ?? 0),
        totalDue: round2((r.principalDue ?? 0) + (r.interestDue ?? 0)),
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map((r, i) => ({ ...r, payoutNo: i + 1 }));

    const interestAmount = round2(rows.reduce((s, r) => s + r.interestDue, 0));
    const principalRepaid = round2(rows.reduce((s, r) => s + r.principalDue, 0));
    // Total return is principal returned in schedule + interest, but if admin
    // didn't schedule principal returns we still consider P repaid at maturity.
    const totalReturn = round2(
      (principalRepaid > 0 ? principalRepaid : principalAmount) + interestAmount
    );
    const maturityDate =
      rows.length > 0 ? rows[rows.length - 1].dueDate : fallbackMaturity;

    return { payouts: rows, interestAmount, totalReturn, maturityDate };
  }

  if (payoutMode === "MONTHLY_INTEREST") {
    const monthlyInterest = round2((principalAmount * interestRate) / 1200);
    const payouts: GeneratedPayout[] = [];
    for (let i = 1; i <= tenureMonths; i++) {
      const isLast = i === tenureMonths;
      const principalDue = isLast ? principalAmount : 0;
      const interestDue = monthlyInterest;
      payouts.push({
        payoutNo: i,
        dueDate: start.add(i, "month").toDate(),
        principalDue,
        interestDue,
        totalDue: round2(principalDue + interestDue),
      });
    }
    const interestAmount = round2(monthlyInterest * tenureMonths);
    return {
      payouts,
      interestAmount,
      totalReturn: round2(principalAmount + interestAmount),
      maturityDate: fallbackMaturity,
    };
  }

  // MONTHLY_EMI — amortized monthly
  const r = interestRate / 1200; // monthly rate
  const n = tenureMonths;
  let emi: number;
  if (r === 0) {
    emi = principalAmount / n;
  } else {
    emi = (principalAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  emi = round2(emi);

  let balance = principalAmount;
  const payouts: GeneratedPayout[] = [];
  for (let i = 1; i <= n; i++) {
    const interestDue = round2(balance * r);
    // Last installment absorbs any rounding drift.
    let principalDue = i === n ? round2(balance) : round2(emi - interestDue);
    if (principalDue < 0) principalDue = 0;
    balance = round2(balance - principalDue);
    payouts.push({
      payoutNo: i,
      dueDate: start.add(i, "month").toDate(),
      principalDue,
      interestDue,
      totalDue: round2(principalDue + interestDue),
    });
  }
  const interestAmount = round2(payouts.reduce((s, p) => s + p.interestDue, 0));
  const totalReturn = round2(payouts.reduce((s, p) => s + p.totalDue, 0));
  return { payouts, interestAmount, totalReturn, maturityDate: fallbackMaturity };
}
