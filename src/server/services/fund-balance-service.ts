import { prisma } from "@/server/db";
import { toNumber } from "@/lib/formatters";

export type FundRange = { from?: Date; to?: Date };

export type FundBreakdown = {
  investorCapitalIn: number;
  customerRepaymentsIn: number;
  processingFeesIn: number;
  totalIn: number;
  principalDisbursedOut: number;
  investorPayoutsOut: number;
  totalOut: number;
  netFund: number;
  counts: {
    investments: number;
    payments: number;
    disbursements: number;
    payouts: number;
  };
};

export type LedgerEntry = {
  date: Date;
  type:
    | "INVESTOR_CAPITAL"
    | "CUSTOMER_REPAYMENT"
    | "PROCESSING_FEE"
    | "LOAN_DISBURSEMENT"
    | "INVESTOR_PAYOUT";
  party: string;
  reference: string;
  inflow: number;
  outflow: number;
};

/**
 * Cash position model:
 *   IN  = investor capital received + customer repayments + processing fees earned
 *   OUT = loan principal disbursed + investor payouts paid
 *   NET = IN − OUT  (cash currently with us)
 *
 * Processing fees are withheld from the disbursement, so we show gross principal out
 * and the fee as separate income — net effect equals cash actually handed over.
 */
export async function getFundBreakdown(range: FundRange = {}): Promise<FundBreakdown> {
  const dateFilter = buildRange(range);

  const [investorAgg, paymentsAgg, loanRows, payoutsAgg] = await Promise.all([
    prisma.investment.aggregate({
      where: dateFilter ? { investmentDate: dateFilter } : {},
      _sum: { principalAmount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { isReversed: false, ...(dateFilter ? { collectedAt: dateFilter } : {}) },
      _sum: { amount: true },
      _count: true,
    }),
    // Processing fees are recognised at disbursement and stored on the account
    // (copied from the application at disbursal; admin-editable on the loan edit page).
    prisma.loanAccount.findMany({
      where: dateFilter ? { disbursedAt: dateFilter } : {},
      select: { principal: true, processingFee: true },
    }),
    prisma.investmentPayout.aggregate({
      where: {
        paidAt: { not: null },
        ...(dateFilter ? { paidAt: dateFilter } : {}),
      },
      _sum: { paidAmount: true },
      _count: true,
    }),
  ]);

  const principalDisbursedOut = loanRows.reduce((s, r) => s + toNumber(r.principal), 0);
  const processingFeesIn = loanRows.reduce(
    (s, r) => s + toNumber(r.processingFee),
    0,
  );

  const investorCapitalIn = toNumber(investorAgg._sum.principalAmount);
  const customerRepaymentsIn = toNumber(paymentsAgg._sum.amount);
  const investorPayoutsOut = toNumber(payoutsAgg._sum.paidAmount);

  const totalIn = investorCapitalIn + customerRepaymentsIn + processingFeesIn;
  const totalOut = principalDisbursedOut + investorPayoutsOut;
  const netFund = totalIn - totalOut;

  return {
    investorCapitalIn,
    customerRepaymentsIn,
    processingFeesIn,
    totalIn,
    principalDisbursedOut,
    investorPayoutsOut,
    totalOut,
    netFund,
    counts: {
      investments: investorAgg._count,
      payments: paymentsAgg._count,
      disbursements: loanRows.length,
      payouts: payoutsAgg._count,
    },
  };
}

/**
 * Combined chronological ledger of every cash movement in the window.
 * Used by the Fund Balance report to compute a running balance.
 */
export async function getFundLedger(range: FundRange = {}): Promise<LedgerEntry[]> {
  const dateFilter = buildRange(range);

  const [investments, payments, disbursements, payouts] = await Promise.all([
    prisma.investment.findMany({
      where: dateFilter ? { investmentDate: dateFilter } : {},
      select: {
        investmentDate: true,
        investmentCode: true,
        principalAmount: true,
        investor: { select: { fullName: true } },
      },
      orderBy: { investmentDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { isReversed: false, ...(dateFilter ? { collectedAt: dateFilter } : {}) },
      select: {
        collectedAt: true,
        receiptNo: true,
        amount: true,
        loanAccount: {
          select: {
            accountNo: true,
            customer: { select: { fullName: true } },
          },
        },
      },
      orderBy: { collectedAt: "asc" },
    }),
    prisma.loanAccount.findMany({
      where: dateFilter ? { disbursedAt: dateFilter } : {},
      select: {
        disbursedAt: true,
        accountNo: true,
        principal: true,
        processingFee: true,
        customer: { select: { fullName: true } },
      },
      orderBy: { disbursedAt: "asc" },
    }),
    prisma.investmentPayout.findMany({
      where: {
        paidAt: { not: null },
        ...(dateFilter ? { paidAt: dateFilter } : {}),
      },
      select: {
        paidAt: true,
        payoutNo: true,
        paidAmount: true,
        investment: {
          select: {
            investmentCode: true,
            investor: { select: { fullName: true } },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const entries: LedgerEntry[] = [];

  for (const i of investments) {
    entries.push({
      date: i.investmentDate,
      type: "INVESTOR_CAPITAL",
      party: i.investor.fullName,
      reference: i.investmentCode,
      inflow: toNumber(i.principalAmount),
      outflow: 0,
    });
  }

  for (const p of payments) {
    entries.push({
      date: p.collectedAt,
      type: "CUSTOMER_REPAYMENT",
      party: p.loanAccount.customer.fullName,
      reference: `${p.receiptNo} · ${p.loanAccount.accountNo}`,
      inflow: toNumber(p.amount),
      outflow: 0,
    });
  }

  for (const d of disbursements) {
    entries.push({
      date: d.disbursedAt,
      type: "LOAN_DISBURSEMENT",
      party: d.customer.fullName,
      reference: d.accountNo,
      inflow: 0,
      outflow: toNumber(d.principal),
    });
    const fee = toNumber(d.processingFee);
    if (fee > 0) {
      entries.push({
        date: d.disbursedAt,
        type: "PROCESSING_FEE",
        party: d.customer.fullName,
        reference: d.accountNo,
        inflow: fee,
        outflow: 0,
      });
    }
  }

  for (const po of payouts) {
    if (!po.paidAt) continue;
    entries.push({
      date: po.paidAt,
      type: "INVESTOR_PAYOUT",
      party: po.investment.investor.fullName,
      reference: `${po.investment.investmentCode} · #${po.payoutNo}`,
      inflow: 0,
      outflow: toNumber(po.paidAmount),
    });
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return entries;
}

function buildRange(range: FundRange) {
  if (!range.from && !range.to) return undefined;
  const r: { gte?: Date; lte?: Date } = {};
  if (range.from) r.gte = range.from;
  if (range.to) r.lte = range.to;
  return r;
}
