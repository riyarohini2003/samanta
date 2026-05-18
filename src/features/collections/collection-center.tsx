"use client";
import { useState, useEffect, useCallback, useMemo, useTransition, type SelectHTMLAttributes } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { IglBadge } from "@/components/ui/igl-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Users, AlertCircle, CheckCircle, Loader2, Search, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/formatters";
import { fmtDate } from "@/lib/dayjs";

type Branch = { id: string; code: string; name: string };
type Employee = { id: string; name: string; employeeCode: string };

type Row = {
  id: string;
  installmentNo: number;
  dueDate: string;
  paidAt: string | null;
  dueAmount: string | number;
  paidAmount: string | number;
  status: string;
  iglSerial?: number;
  loanAccount: {
    id: string;
    accountNo: string;
    loanType: "DAILY" | "WEEKLY" | "MONTHLY";
    pendingAmount: string | number;
    overdueAmount: string | number;
    installmentAmount: string | number;
    customer: { id: string; customerCode: string; fullName: string; mobile: string };
    branch: { id: string; code: string; name: string };
    assignedEmployee: { id: string; name: string };
  };
};

type Summary = {
  totalCustomers: number;
  totalDue: number;
  totalCollected: number;
  pendingCollection: number;
  counts: { pending: number; paid: number; partial: number; missed: number };
};

/** Native <select> with the OS arrow hidden and a Lucide chevron painted on top. */
function StyledSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="group relative">
      <Select
        className={cn(
          "appearance-none pr-9 bg-card font-medium text-foreground/90",
          "[&>option]:bg-background [&>option]:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </Select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
      />
    </div>
  );
}

export function CollectionCenter({
  scope,
  branches,
  employees,
}: {
  scope: "admin" | "employee";
  branches: Branch[];
  employees: Employee[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    date: today,
    dateTo: today,
    branchId: "",
    employeeId: "",
    loanType: "",
    status: "ALL",
    q: "",
    mode: "DUE_ON" as "DUE_ON" | "DUE_UPTO" | "DUE_BETWEEN",
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isPending, startTransition] = useTransition();
  const [payOpen, setPayOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  // Debounce search input to avoid API call on every keystroke
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 400);
    return () => clearTimeout(timer);
  }, [filters.q]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("date", filters.date);
    sp.set("status", filters.status);
    sp.set("mode", filters.mode);
    if (filters.mode === "DUE_BETWEEN") sp.set("dateTo", filters.dateTo);
    if (filters.branchId) sp.set("branchId", filters.branchId);
    if (filters.employeeId) sp.set("employeeId", filters.employeeId);
    if (filters.loanType) sp.set("loanType", filters.loanType);
    if (debouncedQ) sp.set("q", debouncedQ);
    return sp.toString();
  }, [filters.date, filters.dateTo, filters.branchId, filters.employeeId, filters.loanType, filters.status, filters.mode, debouncedQ]);

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await fetch(`/api/v1/collections/due?${query}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to load");
        return;
      }
      setRows(json.data.rows);
      setSummary(json.data.summary);
    });
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Due Customers" value={summary.totalCustomers} tone="info" icon={<Users className="h-6 w-6" />} />
          <StatCard label="Total Due" value={formatMoney(summary.totalDue)} tone="default" icon={<Wallet className="h-6 w-6" />} />
          <StatCard label="Collected" value={formatMoney(summary.totalCollected)} tone="success" icon={<CheckCircle className="h-6 w-6" />} />
          <StatCard label="Pending" value={formatMoney(summary.pendingCollection)} tone="warning" icon={<Clock className="h-6 w-6" />} />
          <StatCard label="Missed" value={summary.counts.missed} tone="danger" icon={<AlertCircle className="h-6 w-6" />} />
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-1">
              <Label className="text-xs">Mode</Label>
              <StyledSelect value={filters.mode} onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value as any }))}>
                <option value="DUE_ON">Due on date</option>
                <option value="DUE_UPTO">Due up to date</option>
                <option value="DUE_BETWEEN">Date range</option>
              </StyledSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{filters.mode === "DUE_BETWEEN" ? "From" : "Date"}</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters((f) => {
                    const date = e.target.value;
                    // Keep To >= From in range mode
                    const dateTo = f.mode === "DUE_BETWEEN" && f.dateTo < date ? date : f.dateTo;
                    return { ...f, date, dateTo };
                  })
                }
              />
            </div>
            {filters.mode === "DUE_BETWEEN" && (
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  min={filters.date}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Loan Type</Label>
              <StyledSelect value={filters.loanType} onChange={(e) => setFilters((f) => ({ ...f, loanType: e.target.value }))}>
                <option value="">All Types</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </StyledSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <StyledSelect value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="MISSED">Missed</option>
              </StyledSelect>
            </div>
            {scope === "admin" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Branch</Label>
                  <StyledSelect value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}>
                    <option value="">All Branches</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
                  </StyledSelect>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Officer</Label>
                  <StyledSelect value={filters.employeeId} onChange={(e) => setFilters((f) => ({ ...f, employeeId: e.target.value }))}>
                    <option value="">All Officers</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.employeeCode} · {e.name}</option>)}
                  </StyledSelect>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, mobile, or account number…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <Button variant="outline" onClick={load} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead className="text-right">Installment</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Collected On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading collections…</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const due = Number(r.dueAmount);
                const paid = Number(r.paidAmount);
                const pending = Math.max(due - paid, 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{r.loanAccount.customer.fullName}</span>
                        <IglBadge serial={r.iglSerial} />
                      </div>
                      <div className="text-xs text-muted-foreground">{r.loanAccount.customer.mobile}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.loanAccount.accountNo}</TableCell>
                    <TableCell><StatusBadge status={r.loanAccount.loanType} /></TableCell>
                    <TableCell className="text-sm">{r.loanAccount.branch.name}</TableCell>
                    <TableCell className="text-sm">{r.loanAccount.assignedEmployee?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(due)}</TableCell>
                    <TableCell className="text-right">{formatMoney(paid)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(pending)}</TableCell>
                    <TableCell>{fmtDate(r.dueDate)}</TableCell>
                    <TableCell className={r.paidAt ? "text-sm" : "text-sm text-muted-foreground"}>
                      {r.paidAt ? fmtDate(r.paidAt) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      {r.status !== "PAID" && (
                        <Button size="sm" onClick={() => { setActiveRow(r); setPayOpen(true); }}>
                          Collect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && !isPending && (
                <TableRow><TableCell colSpan={12} className="py-12 text-center text-muted-foreground">No dues found for the selected filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CollectDialog open={payOpen} row={activeRow} onClose={() => setPayOpen(false)} onSuccess={() => { setPayOpen(false); load(); }} />
    </div>
  );
}

function CollectDialog({
  open,
  row,
  onClose,
  onSuccess,
}: {
  open: boolean;
  row: Row | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ amount: "", mode: "CASH" as "CASH" | "UPI" | "BANK" | "CHEQUE", penalty: "0", note: "" });

  useEffect(() => {
    if (row) {
      const pending = Math.max(Number(row.dueAmount) - Number(row.paidAmount), 0);
      setForm({ amount: String(pending), mode: "CASH", penalty: "0", note: "" });
    }
  }, [row]);

  if (!row) return null;

  async function submit() {
    setLoading(true);
    try {
      const clientRef = crypto.randomUUID();
      const res = await fetch("/api/v1/collections/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanAccountId: row!.loanAccount.id,
          scheduleId: row!.id,
          amount: Number(form.amount),
          penalty: Number(form.penalty || 0),
          mode: form.mode,
          note: form.note || undefined,
          clientRef,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success(`Payment collected · ${json.data.receiptNo}`);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  const pending = Math.max(Number(row.dueAmount) - Number(row.paidAmount), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>
            {row.loanAccount.customer.fullName} · {row.loanAccount.accountNo} · Installment #{row.installmentNo}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Installment Due</span><span className="font-semibold">{formatMoney(row.dueAmount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span>{formatMoney(row.paidAmount)}</span></div>
          <div className="flex justify-between border-t pt-2 mt-2"><span className="font-medium">Pending</span><span className="font-bold">{formatMoney(pending)}</span></div>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Amount *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mode *</Label>
              <Select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as any }))}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank</option>
                <option value="CHEQUE">Cheque</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Penalty</Label>
              <Input type="number" step="0.01" value={form.penalty} onChange={(e) => setForm((f) => ({ ...f, penalty: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Optional note…" />
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !form.amount || Number(form.amount) <= 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Collect & Generate Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
