"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  HandCoins,
  Loader2,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users2,
  Wallet,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { StatCard } from "@/components/ui/stat-card";

type Breakdown = {
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

type LedgerEntry = {
  date: string;
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

const TYPE_META: Record<
  LedgerEntry["type"],
  { label: string; tone: "success" | "danger" | "info" }
> = {
  INVESTOR_CAPITAL: { label: "Investor Capital", tone: "success" },
  CUSTOMER_REPAYMENT: { label: "Customer Repayment", tone: "success" },
  PROCESSING_FEE: { label: "Processing Fee", tone: "info" },
  LOAN_DISBURSEMENT: { label: "Loan Disbursement", tone: "danger" },
  INVESTOR_PAYOUT: { label: "Investor Payout", tone: "danger" },
};

export function FundBalanceView({
  initialBreakdown,
  initialLedger,
}: {
  initialBreakdown: Breakdown;
  initialLedger: LedgerEntry[];
}) {
  const [breakdown, setBreakdown] = React.useState(initialBreakdown);
  const [ledger, setLedger] = React.useState(initialLedger);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<LedgerEntry["type"] | "">("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function applyRange() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/v1/reports/fund-balance?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setBreakdown(json.data.breakdown);
      setLedger(json.data.ledger);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFrom("");
    setTo("");
    setTypeFilter("");
    setBreakdown(initialBreakdown);
    setLedger(initialLedger);
  }

  const filteredLedger = React.useMemo(
    () => (typeFilter ? ledger.filter((e) => e.type === typeFilter) : ledger),
    [ledger, typeFilter],
  );

  // Running balance computed left-to-right over the *unfiltered* ledger so it always reflects
  // the true cash trail. Then we map back to filtered rows by original index.
  const runningByIndex = React.useMemo(() => {
    let bal = 0;
    return ledger.map((e) => {
      bal += e.inflow - e.outflow;
      return bal;
    });
  }, [ledger]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Headline */}
      <Card>
        <CardContent className="flex flex-col items-start gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Net Fund With Us
            </p>
            <p
              className={`mt-1 text-4xl font-bold tabular-nums tracking-tight ${
                breakdown.netFund >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
              }`}
            >
              {formatMoney(breakdown.netFund)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {breakdown.netFund >= 0
                ? "Cash currently held by the company"
                : "Outflows exceed inflows — capital deployed exceeds funds received"}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total In
              </p>
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(breakdown.totalIn)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Out
              </p>
              <p className="text-xl font-bold tabular-nums text-red-600">
                {formatMoney(breakdown.totalOut)}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <PiggyBank className="h-7 w-7" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Inflows
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Investor Capital"
            value={formatMoney(breakdown.investorCapitalIn)}
            hint={`${breakdown.counts.investments} investment${breakdown.counts.investments !== 1 ? "s" : ""}`}
            tone="success"
            icon={<Users2 className="h-6 w-6" />}
          />
          <StatCard
            label="Customer Repayments"
            value={formatMoney(breakdown.customerRepaymentsIn)}
            hint={`${breakdown.counts.payments} payment${breakdown.counts.payments !== 1 ? "s" : ""}`}
            tone="success"
            icon={<HandCoins className="h-6 w-6" />}
          />
          <StatCard
            label="Processing Fees"
            value={formatMoney(breakdown.processingFeesIn)}
            hint={`Across ${breakdown.counts.disbursements} disbursed loan${breakdown.counts.disbursements !== 1 ? "s" : ""}`}
            tone="info"
            icon={<Receipt className="h-6 w-6" />}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Outflows
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Principal Disbursed"
            value={formatMoney(breakdown.principalDisbursedOut)}
            hint={`${breakdown.counts.disbursements} loan${breakdown.counts.disbursements !== 1 ? "s" : ""}`}
            tone="danger"
            icon={<Banknote className="h-6 w-6" />}
          />
          <StatCard
            label="Investor Payouts"
            value={formatMoney(breakdown.investorPayoutsOut)}
            hint={`${breakdown.counts.payouts} payout${breakdown.counts.payouts !== 1 ? "s" : ""} paid`}
            tone="danger"
            icon={<Wallet className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="w-40">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={applyRange} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </>
              ) : (
                "Apply"
              )}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={loading}>
              Reset (All Time)
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">
              {(["", "INVESTOR_CAPITAL", "CUSTOMER_REPAYMENT", "PROCESSING_FEE", "LOAN_DISBURSEMENT", "INVESTOR_PAYOUT"] as const).map(
                (t) => (
                  <button
                    key={t || "ALL"}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      typeFilter === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "" ? "All" : TYPE_META[t].label}
                  </button>
                ),
              )}
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cash Ledger</CardTitle>
          <p className="text-xs text-muted-foreground">
            {filteredLedger.length} entr{filteredLedger.length === 1 ? "y" : "ies"}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No cash movements in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((e) => {
                    const originalIndex = ledger.indexOf(e);
                    const running = runningByIndex[originalIndex] ?? 0;
                    const meta = TYPE_META[e.type];
                    return (
                      <TableRow key={`${e.date}-${e.reference}-${e.type}`}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(e.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] ${
                              meta.tone === "success"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : meta.tone === "danger"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            }`}
                          >
                            {e.inflow > 0 ? (
                              <ArrowUpRight className="mr-1 h-3 w-3 inline" />
                            ) : (
                              <ArrowDownRight className="mr-1 h-3 w-3 inline" />
                            )}
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{e.party}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {e.reference}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {e.inflow > 0 ? formatMoney(e.inflow) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600">
                          {e.outflow > 0 ? formatMoney(e.outflow) : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-semibold ${
                            running >= 0 ? "text-foreground" : "text-red-600"
                          }`}
                        >
                          {running >= 0 ? (
                            <TrendingUp className="mr-1 h-3 w-3 inline text-emerald-500" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3 inline text-red-500" />
                          )}
                          {formatMoney(running)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
