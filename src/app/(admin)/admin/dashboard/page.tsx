import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  Building2, UserCircle, Users, Landmark, FileCheck, FileX,
  Wallet, AlertCircle, TrendingUp,
  IndianRupee, HandCoins, Banknote, PiggyBank,
} from "lucide-react";
import { toDateOnly } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { toNumber } from "@/lib/formatters";
import {
  getLoanStatusDistribution,
  getPortfolioAging,
  getCollectionTrend,
  getBranchPerformance,
} from "@/server/services/dashboard-service";
import { LoanStatusPie, PortfolioAgingBar, CollectionTrendArea, BranchPerformanceBar } from "@/components/ui/dashboard-charts";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = toDateOnly(new Date());

  const [
    totalBranches,
    totalEmployees,
    totalCustomers,
    activeLoans,
    pendingApps,
    rejectedApps,
    dueToday,
    collectedTodayAgg,
    overdueLoans,
    recentApps,
    outstandingAgg,
    totalCollectionAgg,
    totalCapitalAgg,
  ] = await Promise.all([
    prisma.branch.count({ where: { deletedAt: { isSet: false }, isActive: true } }),
    prisma.user.count({ where: { deletedAt: { isSet: false }, isActive: true, role: { not: "SUPER_ADMIN" } } }),
    prisma.customer.count({ where: { deletedAt: { isSet: false } } }),
    prisma.loanAccount.count({ where: { status: "ACTIVE" } }),
    prisma.loanApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.loanApplication.count({ where: { status: "REJECTED" } }),
    prisma.repaymentSchedule.aggregate({
      where: { dueDate: today, status: { in: ["PENDING", "PARTIAL", "MISSED"] } },
      _sum: { dueAmount: true, paidAmount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { collectedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, isReversed: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.loanAccount.count({ where: { status: "OVERDUE" } }),
    prisma.loanApplication.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { fullName: true } }, branch: { select: { name: true } } },
    }),
    // Total Outstanding: pending amount across all active/overdue/NPA loans
    prisma.loanAccount.aggregate({
      where: { status: { in: ["ACTIVE", "OVERDUE", "NPA"] } },
      _sum: { pendingAmount: true, overdueAmount: true },
      _count: true,
    }),
    // Total Collection: all non-reversed payments ever
    prisma.payment.aggregate({
      where: { isReversed: false },
      _sum: { amount: true },
      _count: true,
    }),
    // Total Capital: sum of principal disbursed across all loans
    prisma.loanAccount.aggregate({
      _sum: { principal: true },
      _count: true,
    }),
  ]);

  const totalOutstanding = toNumber(outstandingAgg._sum.pendingAmount);
  const totalCollection = toNumber(totalCollectionAgg._sum.amount);
  const totalCapital = toNumber(totalCapitalAgg._sum.principal);
  const ourFund = totalCollection - totalCapital;

  // Chart data — fetched in parallel
  const [loanStatusData, agingData, collectionTrend, branchPerformance] = await Promise.all([
    getLoanStatusDistribution(),
    getPortfolioAging(),
    getCollectionTrend(7),
    getBranchPerformance(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Admin Dashboard" description="Overview of all branches, loans, and collections" />

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Outstanding"
          value={formatMoney(totalOutstanding)}
          hint={`Across ${outstandingAgg._count} loans`}
          tone="danger"
          icon={<IndianRupee className="h-6 w-6" />}
          href="/admin/loans"
        />
        <StatCard
          label="Total Collection"
          value={formatMoney(totalCollection)}
          hint={`${totalCollectionAgg._count} payments received`}
          tone="success"
          icon={<HandCoins className="h-6 w-6" />}
          href="/admin/collections"
        />
        <StatCard
          label="Total Capital"
          value={formatMoney(totalCapital)}
          hint={`${totalCapitalAgg._count} loans disbursed`}
          tone="info"
          icon={<Banknote className="h-6 w-6" />}
          href="/admin/loans"
        />
        <StatCard
          label="Our Fund With Us"
          value={formatMoney(Math.abs(ourFund))}
          hint={ourFund >= 0 ? "Profit from collections" : "Capital still deployed"}
          tone={ourFund >= 0 ? "success" : "warning"}
          icon={<PiggyBank className="h-6 w-6" />}
          href="/admin/reports"
        />
      </div>

      {/* Operational Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Branches" value={totalBranches} icon={<Building2 className="h-6 w-6" />} href="/admin/branches" />
        <StatCard label="Employees" value={totalEmployees} icon={<UserCircle className="h-6 w-6" />} href="/admin/employees" />
        <StatCard label="Customers" value={totalCustomers} icon={<Users className="h-6 w-6" />} href="/admin/customers" />
        <StatCard label="Active Loans" value={activeLoans} icon={<Landmark className="h-6 w-6" />} href="/admin/loans" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Approvals" value={pendingApps} tone="warning" icon={<FileCheck className="h-6 w-6" />} href="/admin/loan-applications" />
        <StatCard label="Rejected" value={rejectedApps} tone="danger" icon={<FileX className="h-6 w-6" />} href="/admin/loan-applications" />
        <StatCard label="Overdue Loans" value={overdueLoans} tone="danger" icon={<AlertCircle className="h-6 w-6" />} href="/admin/loans" />
        <StatCard label="Today's Due" value={dueToday._count} hint={formatMoney(toNumber(dueToday._sum.dueAmount))} tone="info" icon={<Wallet className="h-6 w-6" />} href="/admin/collections" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected Today" value={formatMoney(toNumber(collectedTodayAgg._sum.amount))} hint={`${collectedTodayAgg._count} payments`} tone="success" icon={<TrendingUp className="h-6 w-6" />} href="/admin/collections" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Loan Status Distribution</CardTitle></CardHeader>
          <CardContent><LoanStatusPie data={loanStatusData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Collection Trend (7 Days)</CardTitle></CardHeader>
          <CardContent><CollectionTrendArea data={collectionTrend} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Portfolio Aging</CardTitle></CardHeader>
          <CardContent><PortfolioAgingBar data={agingData} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Branch Performance</CardTitle></CardHeader>
          <CardContent><BranchPerformanceBar data={branchPerformance} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pending Applications</CardTitle></CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground/50 mb-3">
                <FileCheck className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">No pending applications right now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {recentApps.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3.5 transition-colors hover:bg-muted/30 -mx-6 px-6 first:-mt-1">
                  <div className="min-w-0">
                    <Link href={`/admin/loan-applications/${a.id}`} className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors">{a.applicationNo}</Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">{a.customer.fullName} · {a.branch.name} · {formatMoney(a.principal)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
