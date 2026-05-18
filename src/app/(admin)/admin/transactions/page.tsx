import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { scopeWhere, isAdmin } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  HandCoins,
  Banknote,
  Receipt,
  AlertTriangle,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
} from "lucide-react";
import dayjs from "@/lib/dayjs";
import { formatMoney, toNumber } from "@/lib/formatters";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { TransactionsFilters } from "./transactions-filters";
import { DownloadTransactionsButton } from "./download-button";

export const dynamic = "force-dynamic";

type SearchParams = {
  from?: string;
  to?: string;
  branchId?: string;
};

function parseDateRange(sp: SearchParams) {
  const today = dayjs().format("YYYY-MM-DD");
  const firstOfMonth = dayjs().startOf("month").format("YYYY-MM-DD");
  const fromStr = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : firstOfMonth;
  const toStr = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : today;
  const from = dayjs.utc(fromStr).startOf("day").toDate();
  const to = dayjs.utc(toStr).endOf("day").toDate();
  return { fromStr, toStr, from, to };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { fromStr, toStr, from, to } = parseDateRange(searchParams);
  const scope = scopeWhere(user);

  // Resolve branch filter: admins can pick any branch; branch managers are locked to their branch
  const adminUser = isAdmin(user);
  const requestedBranchId = searchParams.branchId?.trim() || "";
  const branchFilter = adminUser
    ? requestedBranchId
      ? { branchId: requestedBranchId }
      : {}
    : { branchId: user.branchId ?? "__none__" };

  // Branches for dropdown (admins only see all; managers don't need this)
  const branches = adminUser
    ? await prisma.branch.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      })
    : [];

  // ─── Parallel queries ────────────────────────────────────────────────
  const [
    disbursementsAgg,
    disbursementsByMode,
    disbursedLoansForFees,
    paymentsAgg,
    paymentsByMode,
    recentPayments,
    recentDisbursements,
  ] = await Promise.all([
    // Total disbursed in period
    prisma.loanAccount.aggregate({
      where: {
        disbursedAt: { gte: from, lte: to },
        ...scope,
        ...branchFilter,
      },
      _sum: { principal: true },
      _count: true,
    }),
    // Disbursement breakdown by mode
    prisma.loanAccount.groupBy({
      by: ["disbursementMode"],
      where: {
        disbursedAt: { gte: from, lte: to },
        ...scope,
        ...branchFilter,
      },
      _sum: { principal: true },
      _count: { _all: true },
    }),
    // Loan accounts disbursed in range — to compute processing fees from linked application
    prisma.loanAccount.findMany({
      where: {
        disbursedAt: { gte: from, lte: to },
        ...scope,
        ...branchFilter,
      },
      select: {
        processingFee: true,
      },
    }),
    // Total collections in period
    prisma.payment.aggregate({
      where: {
        collectedAt: { gte: from, lte: to },
        isReversed: false,
        loanAccount: { ...scope, ...branchFilter },
      },
      _sum: { amount: true, penalty: true },
      _count: true,
    }),
    // Collection breakdown by mode
    prisma.payment.groupBy({
      by: ["mode"],
      where: {
        collectedAt: { gte: from, lte: to },
        isReversed: false,
        loanAccount: { ...scope, ...branchFilter },
      },
      _sum: { amount: true, penalty: true },
      _count: { _all: true },
    }),
    // Recent collections (latest first, capped)
    prisma.payment.findMany({
      where: {
        collectedAt: { gte: from, lte: to },
        isReversed: false,
        loanAccount: { ...scope, ...branchFilter },
      },
      orderBy: { collectedAt: "desc" },
      take: 50,
      include: {
        loanAccount: {
          select: {
            accountNo: true,
            customer: { select: { fullName: true, customerCode: true } },
            branch: { select: { code: true, name: true } },
          },
        },
        collectedBy: { select: { name: true, employeeCode: true } },
      },
    }),
    // Recent disbursements
    prisma.loanAccount.findMany({
      where: {
        disbursedAt: { gte: from, lte: to },
        ...scope,
        ...branchFilter,
      },
      orderBy: { disbursedAt: "desc" },
      take: 50,
      select: {
        id: true,
        accountNo: true,
        principal: true,
        disbursedAt: true,
        disbursementMode: true,
        loanType: true,
        processingFee: true,
        customer: { select: { fullName: true, customerCode: true } },
        branch: { select: { code: true, name: true } },
        assignedEmployee: { select: { name: true, employeeCode: true } },
      },
    }),
  ]);

  // ─── Derived metrics ─────────────────────────────────────────────────
  const totalDisbursed = toNumber(disbursementsAgg._sum.principal);
  const disbursedCount = disbursementsAgg._count;

  const totalCollections = toNumber(paymentsAgg._sum.amount);
  const totalPenalty = toNumber(paymentsAgg._sum.penalty);
  const paymentsCount = paymentsAgg._count;

  const totalProcessingFees = disbursedLoansForFees.reduce(
    (acc, l) => acc + toNumber(l.processingFee),
    0
  );

  // Net cash flow = collections in – disbursed out (positive = inflow)
  const netCashFlow = totalCollections - totalDisbursed;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Transactions"
        description="Disbursements, collections, processing fees, and penalties for the selected period"
        actions={<DownloadTransactionsButton />}
      />

      <TransactionsFilters
        branches={branches}
        initial={{ from: fromStr, to: toStr, branchId: requestedBranchId }}
        canSelectBranch={adminUser}
      />

      {/* Range indicator */}
      <div className="text-sm text-muted-foreground">
        Showing transactions from{" "}
        <span className="font-medium text-foreground">{fmtDate(fromStr)}</span> to{" "}
        <span className="font-medium text-foreground">{fmtDate(toStr)}</span>
        {requestedBranchId && adminUser && (() => {
          const b = branches.find((x) => x.id === requestedBranchId);
          return b ? (
            <>
              {" · "}
              <span className="font-medium text-foreground">
                {b.code} — {b.name}
              </span>
            </>
          ) : null;
        })()}
      </div>

      {/* Top metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Disbursed"
          value={formatMoney(totalDisbursed)}
          hint={`${disbursedCount} loan${disbursedCount !== 1 ? "s" : ""}`}
          tone="info"
          icon={<Banknote className="h-6 w-6" />}
        />
        <StatCard
          label="Collections"
          value={formatMoney(totalCollections)}
          hint={`${paymentsCount} payment${paymentsCount !== 1 ? "s" : ""}`}
          tone="success"
          icon={<HandCoins className="h-6 w-6" />}
        />
        <StatCard
          label="Processing Fees"
          value={formatMoney(totalProcessingFees)}
          hint={`From ${disbursedCount} disbursement${disbursedCount !== 1 ? "s" : ""}`}
          tone="default"
          icon={<Receipt className="h-6 w-6" />}
        />
        <StatCard
          label="Penalty Collected"
          value={formatMoney(totalPenalty)}
          hint="Late-fee component"
          tone="warning"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
      </div>

      {/* Net flow + breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Net Cash Flow"
          value={formatMoney(Math.abs(netCashFlow))}
          hint={
            netCashFlow >= 0
              ? "Net inflow (collections > disbursements)"
              : "Net outflow (disbursements > collections)"
          }
          tone={netCashFlow >= 0 ? "success" : "danger"}
          icon={
            netCashFlow >= 0 ? (
              <TrendingUp className="h-6 w-6" />
            ) : (
              <TrendingDown className="h-6 w-6" />
            )
          }
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collections by Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentsByMode.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collections in range</p>
            ) : (
              paymentsByMode
                .sort((a, b) => toNumber(b._sum.amount) - toNumber(a._sum.amount))
                .map((m) => (
                  <div
                    key={m.mode}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px]">{m.mode}</Badge>
                      <span className="text-muted-foreground">
                        {m._count._all} txn
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatMoney(toNumber(m._sum.amount))}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disbursements by Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {disbursementsByMode.length === 0 ? (
              <p className="text-sm text-muted-foreground">No disbursements in range</p>
            ) : (
              disbursementsByMode
                .sort(
                  (a, b) => toNumber(b._sum.principal) - toNumber(a._sum.principal)
                )
                .map((m) => (
                  <div
                    key={m.disbursementMode}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px]">{m.disbursementMode}</Badge>
                      <span className="text-muted-foreground">
                        {m._count._all} loan
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatMoney(toNumber(m._sum.principal))}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Disbursements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-sky-500" />
            Recent Disbursements
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing latest {recentDisbursements.length}
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Proc. Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDisbursements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No disbursements in the selected period
                  </TableCell>
                </TableRow>
              ) : (
                recentDisbursements.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">
                      {fmtDate(l.disbursedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/admin/loans`}
                        className="hover:text-primary"
                      >
                        {l.accountNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{l.customer.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {l.customer.customerCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.branch.code} — {l.branch.name}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px]">{l.loanType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px]">{l.disbursementMode}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(toNumber(l.principal))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(toNumber(l.processingFee))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Collections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-emerald-500" />
            Recent Collections
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            Showing latest {recentPayments.length}
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Penalty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No collections in the selected period
                  </TableCell>
                </TableRow>
              ) : (
                recentPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {fmtDateTime(p.collectedAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.receiptNo}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {p.loanAccount.customer.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {p.loanAccount.customer.customerCode}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.loanAccount.accountNo}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.loanAccount.branch.code} — {p.loanAccount.branch.name}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px]">{p.mode}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.collectedBy.name}
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {p.collectedBy.employeeCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(toNumber(p.amount))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {toNumber(p.penalty) > 0
                        ? formatMoney(toNumber(p.penalty))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Help footer */}
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <ArrowRightLeft className="h-3.5 w-3.5" />
        <span>
          Pick a different period above. Use the Reports page for exportable PDF /
          Excel views.
        </span>
      </div>
    </div>
  );
}
