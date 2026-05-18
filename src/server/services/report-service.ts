import { prisma } from "@/server/db";
import { toDateOnly } from "@/lib/dayjs";
import dayjs from "@/lib/dayjs";
import { toNumber } from "@/lib/formatters";
import type { CurrentUser } from "@/server/auth/session";
import { scopeWhere, loanScopeWhere } from "@/server/auth/guards";
import type { Prisma } from "@prisma/client";

// ─── Common types ──────────────────────────────────────────────────────
export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type ReportResult = {
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: Record<string, string | number>;
};

export type ReportFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  employeeId?: string;
  customerId?: string;
  loanType?: string;
  status?: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────
function fmtD(d: Date | string | null | undefined): string {
  if (!d) return "";
  return dayjs(d).format("DD MMM YYYY");
}

function fmtDT(d: Date | string | null | undefined): string {
  if (!d) return "";
  return dayjs(d).format("DD MMM YYYY HH:mm");
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "0.00";
  return v.toFixed(2);
}

function filterLabel(filters: ReportFilters): Record<string, string> {
  const labels: Record<string, string> = {};
  if (filters.date) labels["Date"] = filters.date;
  if (filters.dateFrom) labels["From"] = filters.dateFrom;
  if (filters.dateTo) labels["To"] = filters.dateTo;
  if (filters.branchId) labels["Branch"] = filters.branchId;
  if (filters.employeeId) labels["Employee"] = filters.employeeId;
  if (filters.customerId) labels["Customer"] = filters.customerId;
  if (filters.loanType) labels["Loan Type"] = filters.loanType;
  if (filters.status) labels["Status"] = filters.status;
  return labels;
}

// ─── 1. Daily Collection Sheet ─────────────────────────────────────────
export async function dailyCollectionSheet(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const date = filters.date || dayjs().format("YYYY-MM-DD");
  const start = toDateOnly(date);
  const end = dayjs.utc(date).endOf("day").toDate();

  const where: Prisma.PaymentWhereInput = {
    collectedAt: { gte: start, lte: end },
    isReversed: false,
    loanAccount: {
      ...loanScopeWhere(user),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    ...(filters.employeeId ? { collectedById: filters.employeeId } : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      loanAccount: {
        include: {
          customer: { select: { fullName: true, customerCode: true, mobile: true } },
          branch: { select: { code: true, name: true } },
        },
      },
      collectedBy: { select: { name: true, employeeCode: true } },
    },
    orderBy: { collectedAt: "asc" },
    take: 1000,
  });

  let totalAmount = 0;
  let totalPenalty = 0;

  const rows = payments.map((p) => {
    totalAmount += toNumber(p.amount);
    totalPenalty += toNumber(p.penalty);
    return {
      receiptNo: p.receiptNo,
      branch: p.loanAccount.branch.name,
      customerCode: p.loanAccount.customer.customerCode,
      customer: p.loanAccount.customer.fullName,
      mobile: p.loanAccount.customer.mobile,
      loanAccount: p.loanAccount.accountNo,
      amount: toNumber(p.amount),
      penalty: toNumber(p.penalty),
      mode: p.mode,
      collectedBy: p.collectedBy.name,
      time: fmtDT(p.collectedAt),
    };
  });

  return {
    title: "Daily Collection Sheet",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { Date: date, ...filterLabel(filters) },
    columns: [
      { key: "receiptNo", label: "Receipt #" },
      { key: "branch", label: "Branch" },
      { key: "customerCode", label: "Cust Code" },
      { key: "customer", label: "Customer Name" },
      { key: "mobile", label: "Mobile" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "penalty", label: "Penalty", align: "right" },
      { key: "mode", label: "Mode" },
      { key: "collectedBy", label: "Collected By" },
      { key: "time", label: "Time" },
    ],
    rows,
    summary: {
      "Total Collections": rows.length,
      "Total Amount": fmtMoney(totalAmount),
      "Total Penalty": fmtMoney(totalPenalty),
      "Grand Total": fmtMoney(totalAmount + totalPenalty),
    },
  };
}

// ─── 2. Cash Book ──────────────────────────────────────────────────────
export async function cashBook(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const from = filters.dateFrom || dayjs().startOf("month").format("YYYY-MM-DD");
  const to = filters.dateTo || dayjs().format("YYYY-MM-DD");

  const payments = await prisma.payment.findMany({
    where: {
      collectedAt: { gte: toDateOnly(from), lte: dayjs.utc(to).endOf("day").toDate() },
      mode: "CASH",
      isReversed: false,
      loanAccount: {
        ...loanScopeWhere(user),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
      },
    },
    include: {
      loanAccount: {
        include: {
          customer: { select: { fullName: true, customerCode: true } },
          branch: { select: { code: true, name: true } },
        },
      },
      collectedBy: { select: { name: true } },
    },
    orderBy: { collectedAt: "asc" },
    take: 2000,
  });

  let runningTotal = 0;
  const rows = payments.map((p) => {
    runningTotal += toNumber(p.amount);
    return {
      date: fmtD(p.collectedAt),
      receiptNo: p.receiptNo,
      branch: p.loanAccount.branch.name,
      customer: p.loanAccount.customer.fullName,
      loanAccount: p.loanAccount.accountNo,
      description: `Cash collection - ${p.loanAccount.customer.fullName}`,
      inflow: toNumber(p.amount),
      runningTotal,
      collectedBy: p.collectedBy.name,
    };
  });

  return {
    title: "Cash Book",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { From: from, To: to, ...filterLabel(filters) },
    columns: [
      { key: "date", label: "Date" },
      { key: "receiptNo", label: "Receipt #" },
      { key: "branch", label: "Branch" },
      { key: "customer", label: "Customer" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "description", label: "Description" },
      { key: "inflow", label: "Cash In", align: "right" },
      { key: "runningTotal", label: "Running Total", align: "right" },
      { key: "collectedBy", label: "Collected By" },
    ],
    rows,
    summary: {
      "Total Entries": rows.length,
      "Total Cash Inflow": fmtMoney(runningTotal),
    },
  };
}

// ─── 3. Branch Summary ─────────────────────────────────────────────────
export async function branchSummary(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const scope = scopeWhere(user);

  const branches = await prisma.branch.findMany({
    where: { ...scope, isActive: true, deletedAt: null },
    select: { id: true, code: true, name: true, city: true },
    orderBy: { code: "asc" },
  });

  const rows = await Promise.all(
    branches.map(async (b) => {
      const loanWhere: Prisma.LoanAccountWhereInput = { branchId: b.id };
      const [total, active, closed, overdue, npa, agg] = await Promise.all([
        prisma.loanAccount.count({ where: loanWhere }),
        prisma.loanAccount.count({ where: { ...loanWhere, status: "ACTIVE" } }),
        prisma.loanAccount.count({ where: { ...loanWhere, status: "CLOSED" } }),
        prisma.loanAccount.count({ where: { ...loanWhere, status: "OVERDUE" } }),
        prisma.loanAccount.count({ where: { ...loanWhere, status: "NPA" } }),
        prisma.loanAccount.aggregate({
          where: loanWhere,
          _sum: { principal: true, totalPayable: true, paidAmount: true, pendingAmount: true, overdueAmount: true },
        }),
      ]);

      return {
        branchCode: b.code,
        branchName: b.name,
        city: b.city,
        totalLoans: total,
        active,
        closed,
        overdue,
        npa,
        principal: toNumber(agg._sum.principal),
        totalPayable: toNumber(agg._sum.totalPayable),
        collected: toNumber(agg._sum.paidAmount),
        outstanding: toNumber(agg._sum.pendingAmount),
        overdueAmount: toNumber(agg._sum.overdueAmount),
      };
    })
  );

  const totals = rows.reduce(
    (acc, r) => ({
      totalLoans: acc.totalLoans + r.totalLoans,
      principal: acc.principal + r.principal,
      collected: acc.collected + r.collected,
      outstanding: acc.outstanding + r.outstanding,
    }),
    { totalLoans: 0, principal: 0, collected: 0, outstanding: 0 }
  );

  return {
    title: "Branch Summary",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: filterLabel(filters),
    columns: [
      { key: "branchCode", label: "Code" },
      { key: "branchName", label: "Branch Name" },
      { key: "city", label: "City" },
      { key: "totalLoans", label: "Total Loans", align: "right" },
      { key: "active", label: "Active", align: "right" },
      { key: "closed", label: "Closed", align: "right" },
      { key: "overdue", label: "Overdue", align: "right" },
      { key: "npa", label: "NPA", align: "right" },
      { key: "principal", label: "Principal", align: "right" },
      { key: "collected", label: "Collected", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
    ],
    rows,
    summary: {
      "Total Branches": rows.length,
      "Total Loans": totals.totalLoans,
      "Total Principal": fmtMoney(totals.principal),
      "Total Collected": fmtMoney(totals.collected),
      "Total Outstanding": fmtMoney(totals.outstanding),
    },
  };
}

// ─── 4. Employee Performance ───────────────────────────────────────────
export async function employeePerformance(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const from = filters.dateFrom || dayjs().startOf("month").format("YYYY-MM-DD");
  const to = filters.dateTo || dayjs().format("YYYY-MM-DD");
  const dateRange = {
    gte: toDateOnly(from),
    lte: dayjs.utc(to).endOf("day").toDate(),
  };

  const empWhere: Prisma.UserWhereInput = {
    ...scopeWhere(user),
    role: "EMPLOYEE",
    isActive: true,
    deletedAt: null,
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.employeeId ? { id: filters.employeeId } : {}),
  };

  const employees = await prisma.user.findMany({
    where: empWhere,
    select: { id: true, employeeCode: true, name: true, branch: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const loanWhere: Prisma.LoanAccountWhereInput = { assignedEmployeeId: emp.id };
      const [
        totalLoans,
        activeLoans,
        overdueLoans,
        loanAgg,
        periodCollections,
        customerCount,
      ] = await Promise.all([
        prisma.loanAccount.count({ where: loanWhere }),
        prisma.loanAccount.count({ where: { ...loanWhere, status: "ACTIVE" } }),
        prisma.loanAccount.count({
          where: { ...loanWhere, status: { in: ["OVERDUE", "NPA"] } },
        }),
        prisma.loanAccount.aggregate({
          where: loanWhere,
          _sum: { principal: true, paidAmount: true, pendingAmount: true },
        }),
        prisma.payment.aggregate({
          where: { collectedById: emp.id, collectedAt: dateRange, isReversed: false },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.loanAccount.groupBy({
          by: ["customerId"],
          where: loanWhere,
        }),
      ]);

      const disbursed = toNumber(loanAgg._sum.principal);
      const collected = toNumber(loanAgg._sum.paidAmount);
      const outstanding = toNumber(loanAgg._sum.pendingAmount);
      const periodAmt = toNumber(periodCollections._sum.amount);

      return {
        employeeCode: emp.employeeCode,
        name: emp.name,
        branch: emp.branch?.name ?? "—",
        customers: customerCount.length,
        totalLoans,
        activeLoans,
        overdueLoans,
        disbursed,
        totalCollected: collected,
        outstanding,
        periodCollection: periodAmt,
        periodTxns: periodCollections._count,
        collectionPct: disbursed > 0 ? Math.round((collected / disbursed) * 100) : 0,
      };
    })
  );

  return {
    title: "Employee Performance",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { From: from, To: to, ...filterLabel(filters) },
    columns: [
      { key: "employeeCode", label: "Emp Code" },
      { key: "name", label: "Employee Name" },
      { key: "branch", label: "Branch" },
      { key: "customers", label: "Customers", align: "right" },
      { key: "totalLoans", label: "Total Loans", align: "right" },
      { key: "activeLoans", label: "Active", align: "right" },
      { key: "overdueLoans", label: "Overdue", align: "right" },
      { key: "disbursed", label: "Disbursed", align: "right" },
      { key: "totalCollected", label: "Total Collected", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "periodCollection", label: "Period Collection", align: "right" },
      { key: "periodTxns", label: "Period Txns", align: "right" },
      { key: "collectionPct", label: "Collection %", align: "right" },
    ],
    rows,
    summary: {
      "Total Employees": rows.length,
      "Total Disbursed": fmtMoney(rows.reduce((s, r) => s + r.disbursed, 0)),
      "Total Collected": fmtMoney(rows.reduce((s, r) => s + r.totalCollected, 0)),
      "Total Outstanding": fmtMoney(rows.reduce((s, r) => s + r.outstanding, 0)),
    },
  };
}

// ─── 5. Due List ───────────────────────────────────────────────────────
export async function dueList(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const date = filters.date || dayjs().format("YYYY-MM-DD");

  const loanWhere: Prisma.LoanAccountWhereInput = {
    ...loanScopeWhere(user),
    status: { in: ["ACTIVE", "OVERDUE"] },
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.employeeId ? { assignedEmployeeId: filters.employeeId } : {}),
    ...(filters.loanType ? { loanType: filters.loanType as any } : {}),
  };

  const schedules = await prisma.repaymentSchedule.findMany({
    where: {
      dueDate: toDateOnly(date),
      status: { in: ["PENDING", "PARTIAL", "MISSED"] },
      loanAccount: loanWhere,
    },
    include: {
      loanAccount: {
        include: {
          customer: { select: { fullName: true, customerCode: true, mobile: true } },
          branch: { select: { code: true, name: true } },
          assignedEmployee: { select: { name: true, employeeCode: true } },
        },
      },
    },
    orderBy: [
      { loanAccount: { branch: { code: "asc" } } },
      { loanAccount: { accountNo: "asc" } },
    ],
    take: 1000,
  });

  let totalDue = 0;
  let totalPaid = 0;

  const rows = schedules.map((s) => {
    const due = toNumber(s.dueAmount);
    const paid = toNumber(s.paidAmount);
    totalDue += due;
    totalPaid += paid;
    return {
      branch: s.loanAccount.branch.name,
      customerCode: s.loanAccount.customer.customerCode,
      customer: s.loanAccount.customer.fullName,
      mobile: s.loanAccount.customer.mobile,
      loanAccount: s.loanAccount.accountNo,
      loanType: s.loanAccount.loanType,
      installmentNo: s.installmentNo,
      dueDate: fmtD(s.dueDate),
      dueAmount: due,
      paidAmount: paid,
      balance: due - paid,
      status: s.status,
      employee: s.loanAccount.assignedEmployee.name,
    };
  });

  return {
    title: "Due List",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { Date: date, ...filterLabel(filters) },
    columns: [
      { key: "branch", label: "Branch" },
      { key: "customerCode", label: "Cust Code" },
      { key: "customer", label: "Customer Name" },
      { key: "mobile", label: "Mobile" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "loanType", label: "Type" },
      { key: "installmentNo", label: "Inst #", align: "right" },
      { key: "dueDate", label: "Due Date" },
      { key: "dueAmount", label: "Due Amount", align: "right" },
      { key: "paidAmount", label: "Paid", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
      { key: "status", label: "Status" },
      { key: "employee", label: "Employee" },
    ],
    rows,
    summary: {
      "Total Dues": rows.length,
      "Total Due Amount": fmtMoney(totalDue),
      "Total Paid": fmtMoney(totalPaid),
      "Total Pending": fmtMoney(totalDue - totalPaid),
    },
  };
}

// ─── 6. Overdue / NPA Report ───────────────────────────────────────────
export async function overdueNpa(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const statusFilter = filters.status === "NPA" ? ["NPA"] : filters.status === "OVERDUE" ? ["OVERDUE"] : ["OVERDUE", "NPA"];

  const loans = await prisma.loanAccount.findMany({
    where: {
      ...loanScopeWhere(user),
      status: { in: statusFilter as any },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.employeeId ? { assignedEmployeeId: filters.employeeId } : {}),
    },
    include: {
      customer: { select: { fullName: true, customerCode: true, mobile: true } },
      branch: { select: { code: true, name: true } },
      assignedEmployee: { select: { name: true, employeeCode: true } },
    },
    orderBy: { overdueAmount: "desc" },
    take: 1000,
  });

  const today = dayjs();
  const rows = loans.map((l) => {
    const daysOverdue = l.nextDueDate ? today.diff(dayjs(l.nextDueDate), "day") : 0;
    return {
      branch: l.branch.name,
      customerCode: l.customer.customerCode,
      customer: l.customer.fullName,
      mobile: l.customer.mobile,
      loanAccount: l.accountNo,
      loanType: l.loanType,
      principal: toNumber(l.principal),
      totalPayable: toNumber(l.totalPayable),
      paid: toNumber(l.paidAmount),
      outstanding: toNumber(l.pendingAmount),
      overdueAmount: toNumber(l.overdueAmount),
      daysOverdue: Math.max(daysOverdue, 0),
      status: l.status,
      employee: l.assignedEmployee.name,
      lastDueDate: fmtD(l.nextDueDate),
    };
  });

  return {
    title: "Overdue / NPA Report",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: filterLabel(filters),
    columns: [
      { key: "branch", label: "Branch" },
      { key: "customerCode", label: "Cust Code" },
      { key: "customer", label: "Customer Name" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "loanType", label: "Type" },
      { key: "principal", label: "Principal", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "overdueAmount", label: "Overdue Amt", align: "right" },
      { key: "daysOverdue", label: "Days Overdue", align: "right" },
      { key: "status", label: "Status" },
      { key: "employee", label: "Employee" },
      { key: "lastDueDate", label: "Next Due" },
    ],
    rows,
    summary: {
      "Total Accounts": rows.length,
      "Total Outstanding": fmtMoney(rows.reduce((s, r) => s + r.outstanding, 0)),
      "Total Overdue Amount": fmtMoney(rows.reduce((s, r) => s + r.overdueAmount, 0)),
    },
  };
}

// ─── 7. Portfolio Aging ────────────────────────────────────────────────
export async function portfolioAging(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const loans = await prisma.loanAccount.findMany({
    where: {
      ...loanScopeWhere(user),
      status: { in: ["ACTIVE", "OVERDUE", "NPA"] },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    },
    select: {
      id: true,
      pendingAmount: true,
      principal: true,
      nextDueDate: true,
      status: true,
    },
  });

  const today = dayjs();
  const buckets = [
    { label: "Current (not due)", min: -Infinity, max: 0 },
    { label: "1-30 Days", min: 1, max: 30 },
    { label: "31-60 Days", min: 31, max: 60 },
    { label: "61-90 Days", min: 61, max: 90 },
    { label: "91-180 Days", min: 91, max: 180 },
    { label: "180+ Days", min: 181, max: Infinity },
  ];

  const bucketData = buckets.map((b) => ({
    ...b,
    count: 0,
    outstanding: 0,
    principal: 0,
  }));

  let totalOutstanding = 0;

  for (const loan of loans) {
    const daysOverdue = loan.nextDueDate
      ? today.diff(dayjs(loan.nextDueDate), "day")
      : 0;
    const pending = toNumber(loan.pendingAmount);
    const princ = toNumber(loan.principal);
    totalOutstanding += pending;

    for (const b of bucketData) {
      if (daysOverdue >= b.min && daysOverdue <= b.max) {
        b.count++;
        b.outstanding += pending;
        b.principal += princ;
        break;
      }
    }
  }

  const rows = bucketData.map((b) => ({
    bucket: b.label,
    count: b.count,
    principal: b.principal,
    outstanding: b.outstanding,
    percentage: totalOutstanding > 0
      ? Math.round((b.outstanding / totalOutstanding) * 10000) / 100
      : 0,
  }));

  return {
    title: "Portfolio Aging",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: filterLabel(filters),
    columns: [
      { key: "bucket", label: "Aging Bucket" },
      { key: "count", label: "No. of Loans", align: "right" },
      { key: "principal", label: "Principal", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "percentage", label: "% of Portfolio", align: "right" },
    ],
    rows,
    summary: {
      "Total Loans": loans.length,
      "Total Outstanding": fmtMoney(totalOutstanding),
    },
  };
}

// ─── 8. Disbursement Register ──────────────────────────────────────────
export async function disbursementRegister(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const from = filters.dateFrom || dayjs().startOf("month").format("YYYY-MM-DD");
  const to = filters.dateTo || dayjs().format("YYYY-MM-DD");

  const loans = await prisma.loanAccount.findMany({
    where: {
      ...loanScopeWhere(user),
      disbursedAt: {
        gte: toDateOnly(from),
        lte: dayjs.utc(to).endOf("day").toDate(),
      },
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.loanType ? { loanType: filters.loanType as any } : {}),
    },
    include: {
      customer: { select: { fullName: true, customerCode: true } },
      branch: { select: { code: true, name: true } },
      assignedEmployee: { select: { name: true } },
    },
    orderBy: { disbursedAt: "desc" },
    take: 1000,
  });

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalPayable = 0;

  const rows = loans.map((l) => {
    totalPrincipal += toNumber(l.principal);
    totalInterest += toNumber(l.interestAmount);
    totalPayable += toNumber(l.totalPayable);
    return {
      date: fmtD(l.disbursedAt),
      loanAccount: l.accountNo,
      customerCode: l.customer.customerCode,
      customer: l.customer.fullName,
      branch: l.branch.name,
      loanType: l.loanType,
      principal: toNumber(l.principal),
      interestAmount: toNumber(l.interestAmount),
      totalPayable: toNumber(l.totalPayable),
      installmentAmount: toNumber(l.installmentAmount),
      disbursementMode: l.disbursementMode,
      maturityDate: fmtD(l.maturityDate),
      employee: l.assignedEmployee.name,
    };
  });

  return {
    title: "Disbursement Register",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { From: from, To: to, ...filterLabel(filters) },
    columns: [
      { key: "date", label: "Disbursed On" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "customerCode", label: "Cust Code" },
      { key: "customer", label: "Customer Name" },
      { key: "branch", label: "Branch" },
      { key: "loanType", label: "Type" },
      { key: "principal", label: "Principal", align: "right" },
      { key: "interestAmount", label: "Interest", align: "right" },
      { key: "totalPayable", label: "Total Payable", align: "right" },
      { key: "installmentAmount", label: "EMI", align: "right" },
      { key: "disbursementMode", label: "Mode" },
      { key: "maturityDate", label: "Maturity" },
      { key: "employee", label: "Employee" },
    ],
    rows,
    summary: {
      "Total Disbursements": rows.length,
      "Total Principal": fmtMoney(totalPrincipal),
      "Total Interest": fmtMoney(totalInterest),
      "Total Payable": fmtMoney(totalPayable),
    },
  };
}

// ─── 9. Customer Ledger ────────────────────────────────────────────────
export async function customerLedger(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  if (!filters.customerId) {
    return {
      title: "Customer Ledger",
      generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
      filters: {},
      columns: [],
      rows: [],
      summary: { Note: "Please select a customer" },
    };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: filters.customerId },
    select: { fullName: true, customerCode: true, mobile: true },
  });

  const loans = await prisma.loanAccount.findMany({
    where: {
      customerId: filters.customerId,
      ...loanScopeWhere(user),
    },
    include: {
      payments: {
        where: { isReversed: false },
        orderBy: { collectedAt: "asc" },
        include: { collectedBy: { select: { name: true } } },
      },
      branch: { select: { name: true } },
    },
    orderBy: { disbursedAt: "desc" },
  });

  const rows: Record<string, string | number | null>[] = [];
  let runningBalance = 0;

  for (const loan of loans) {
    // Disbursement row
    runningBalance += toNumber(loan.totalPayable);
    rows.push({
      date: fmtD(loan.disbursedAt),
      loanAccount: loan.accountNo,
      description: `Loan disbursed - ${loan.loanType}`,
      debit: toNumber(loan.totalPayable),
      credit: 0,
      balance: runningBalance,
      mode: loan.disbursementMode,
      reference: loan.accountNo,
    });

    // Payment rows
    for (const p of loan.payments) {
      runningBalance -= toNumber(p.amount);
      rows.push({
        date: fmtD(p.collectedAt),
        loanAccount: loan.accountNo,
        description: `Payment - Receipt #${p.receiptNo}`,
        debit: 0,
        credit: toNumber(p.amount),
        balance: runningBalance,
        mode: p.mode,
        reference: p.receiptNo,
      });
    }
  }

  return {
    title: "Customer Ledger",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: {
      Customer: customer?.fullName ?? filters.customerId,
      Code: customer?.customerCode ?? "",
      Mobile: customer?.mobile ?? "",
    },
    columns: [
      { key: "date", label: "Date" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "description", label: "Description" },
      { key: "debit", label: "Debit", align: "right" },
      { key: "credit", label: "Credit", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
      { key: "mode", label: "Mode" },
      { key: "reference", label: "Reference" },
    ],
    rows,
    summary: {
      "Total Loans": loans.length,
      "Total Debits": fmtMoney(rows.reduce((s, r) => s + toNumber(r.debit), 0)),
      "Total Credits": fmtMoney(rows.reduce((s, r) => s + toNumber(r.credit), 0)),
      "Current Balance": fmtMoney(runningBalance),
    },
  };
}

// ─── 10. Interest Report ───────────────────────────────────────────────
export async function interestReport(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const loans = await prisma.loanAccount.findMany({
    where: {
      ...loanScopeWhere(user),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      status: { in: ["ACTIVE", "OVERDUE", "NPA", "CLOSED"] },
    },
    include: {
      customer: { select: { fullName: true, customerCode: true } },
      branch: { select: { name: true } },
      application: { select: { interestRate: true } },
    },
    orderBy: { branch: { code: "asc" } },
    take: 1000,
  });

  let totalInterest = 0;
  let totalCollectedInterest = 0;

  const rows = loans.map((l) => {
    const interest = toNumber(l.interestAmount);
    const paid = toNumber(l.paidAmount);
    const principal = toNumber(l.principal);
    // Proportional interest collected: (paid / totalPayable) * interestAmount
    const totalPayable = toNumber(l.totalPayable);
    const collectedInterest =
      totalPayable > 0 ? (paid / totalPayable) * interest : 0;
    const pendingInterest = Math.max(interest - collectedInterest, 0);

    totalInterest += interest;
    totalCollectedInterest += collectedInterest;

    return {
      branch: l.branch.name,
      customerCode: l.customer.customerCode,
      customer: l.customer.fullName,
      loanAccount: l.accountNo,
      loanType: l.loanType,
      principal,
      interestRate: l.application?.interestRate ?? 0,
      interestAmount: interest,
      collectedInterest: Math.round(collectedInterest * 100) / 100,
      pendingInterest: Math.round(pendingInterest * 100) / 100,
      status: l.status,
    };
  });

  return {
    title: "Interest Report",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: filterLabel(filters),
    columns: [
      { key: "branch", label: "Branch" },
      { key: "customerCode", label: "Cust Code" },
      { key: "customer", label: "Customer" },
      { key: "loanAccount", label: "Loan A/C" },
      { key: "loanType", label: "Type" },
      { key: "principal", label: "Principal", align: "right" },
      { key: "interestRate", label: "Rate %", align: "right" },
      { key: "interestAmount", label: "Total Interest", align: "right" },
      { key: "collectedInterest", label: "Collected", align: "right" },
      { key: "pendingInterest", label: "Pending", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
    summary: {
      "Total Loans": rows.length,
      "Total Interest": fmtMoney(totalInterest),
      "Total Collected Interest": fmtMoney(totalCollectedInterest),
      "Total Pending Interest": fmtMoney(totalInterest - totalCollectedInterest),
    },
  };
}

// ─── 11. Tax Report ────────────────────────────────────────────────────
export async function taxReport(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const from = filters.dateFrom || dayjs().startOf("year").format("YYYY-MM-DD");
  const to = filters.dateTo || dayjs().format("YYYY-MM-DD");
  const dateRange = {
    gte: toDateOnly(from),
    lte: dayjs.utc(to).endOf("day").toDate(),
  };

  const scope = loanScopeWhere(user);

  // Interest + processing-fee income from loans disbursed in period (both stored on the account)
  const [disbursedLoans, collectionAgg] = await Promise.all([
    prisma.loanAccount.aggregate({
      where: { ...scope, disbursedAt: dateRange },
      _sum: { principal: true, interestAmount: true, totalPayable: true, processingFee: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        collectedAt: dateRange,
        isReversed: false,
        loanAccount: scope,
      },
      _sum: { amount: true, penalty: true },
      _count: true,
    }),
  ]);

  const interestIncome = toNumber(disbursedLoans._sum.interestAmount);
  const collectionAmount = toNumber(collectionAgg._sum.amount);
  const penaltyIncome = toNumber(collectionAgg._sum.penalty);
  const processingFees = toNumber(disbursedLoans._sum.processingFee);
  const totalIncome = interestIncome + penaltyIncome + processingFees;

  const rows: Record<string, string | number | null>[] = [
    {
      category: "Interest Income (on loans disbursed in period)",
      count: disbursedLoans._count,
      grossAmount: interestIncome,
      description: "Total interest component of loans disbursed",
    },
    {
      category: "Processing Fee Income",
      count: disbursedLoans._count,
      grossAmount: processingFees,
      description: "Processing fees collected on disbursed loans",
    },
    {
      category: "Penalty Income",
      count: collectionAgg._count,
      grossAmount: penaltyIncome,
      description: "Late payment penalties collected",
    },
    {
      category: "Total Collections in Period",
      count: collectionAgg._count,
      grossAmount: collectionAmount,
      description: "Total payments received (principal + interest)",
    },
    {
      category: "Principal Disbursed",
      count: disbursedLoans._count,
      grossAmount: toNumber(disbursedLoans._sum.principal),
      description: "Total principal amount disbursed",
    },
  ];

  return {
    title: "Tax Report",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { "Financial Year From": from, "Financial Year To": to },
    columns: [
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "count", label: "Count", align: "right" },
      { key: "grossAmount", label: "Amount", align: "right" },
    ],
    rows,
    summary: {
      "Total Income (Interest + Fees + Penalty)": fmtMoney(totalIncome),
      "Total Collections": fmtMoney(collectionAmount),
      "Principal Disbursed": fmtMoney(toNumber(disbursedLoans._sum.principal)),
    },
  };
}

// ─── 12. Audit Report ──────────────────────────────────────────────────
export async function auditReport(
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const from = filters.dateFrom || dayjs().subtract(7, "day").format("YYYY-MM-DD");
  const to = filters.dateTo || dayjs().format("YYYY-MM-DD");

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: toDateOnly(from),
        lte: dayjs.utc(to).endOf("day").toDate(),
      },
      ...(filters.employeeId ? { userId: filters.employeeId } : {}),
    },
    include: {
      user: { select: { name: true, employeeCode: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const rows = logs.map((l) => ({
    date: fmtDT(l.createdAt),
    user: l.user?.name ?? "System",
    employeeCode: l.user?.employeeCode ?? "—",
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    ip: l.ip ?? "—",
    userAgent: l.userAgent ? l.userAgent.substring(0, 50) : "—",
  }));

  return {
    title: "Audit Report",
    generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
    filters: { From: from, To: to, ...filterLabel(filters) },
    columns: [
      { key: "date", label: "Date & Time" },
      { key: "user", label: "User" },
      { key: "employeeCode", label: "Emp Code" },
      { key: "action", label: "Action" },
      { key: "entityType", label: "Entity Type" },
      { key: "entityId", label: "Entity ID" },
      { key: "ip", label: "IP Address" },
    ],
    rows,
    summary: {
      "Total Entries": rows.length,
      "Period": `${from} to ${to}`,
    },
  };
}

// ─── Dispatcher ────────────────────────────────────────────────────────
export const REPORT_TYPES = {
  "daily-collection": { label: "Daily Collection Sheet", fn: dailyCollectionSheet },
  "cash-book": { label: "Cash Book", fn: cashBook },
  "branch-summary": { label: "Branch Summary", fn: branchSummary },
  "employee-performance": { label: "Employee Performance", fn: employeePerformance },
  "due-list": { label: "Due List", fn: dueList },
  "overdue-npa": { label: "Overdue / NPA", fn: overdueNpa },
  "portfolio-aging": { label: "Portfolio Aging", fn: portfolioAging },
  "disbursement-register": { label: "Disbursement Register", fn: disbursementRegister },
  "customer-ledger": { label: "Customer Ledger", fn: customerLedger },
  "interest-report": { label: "Interest Report", fn: interestReport },
  "tax-report": { label: "Tax Report", fn: taxReport },
  "audit-report": { label: "Audit Report", fn: auditReport },
} as const;

export type ReportType = keyof typeof REPORT_TYPES;

export async function generateReport(
  type: ReportType,
  user: CurrentUser,
  filters: ReportFilters
): Promise<ReportResult> {
  const entry = REPORT_TYPES[type];
  if (!entry) throw new Error(`Unknown report type: ${type}`);
  return entry.fn(user, filters);
}
