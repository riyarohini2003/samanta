"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, X } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

type Customer = {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  branchId: string;
  branchName?: string;
};

type Branch = { id: string; code: string; name: string };

type CalcResult = {
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  maturityDate: string;
  effectiveAnnualRate?: number;
} | null;

export interface LoanApplicationFormInitial {
  id: string;
  applicationNo: string;
  customerId: string;
  loanType: "DAILY" | "WEEKLY" | "MONTHLY";
  principal: number;
  interestRate: number;
  processingFee: number;
  tenureCount: number;
  startDate: Date | string;
  purpose?: string | null;
  notes?: string | null;
}

export function LoanApplicationForm({
  customers,
  branches,
  defaultCustomerId,
  returnTo,
  initial,
}: {
  customers: Customer[];
  branches: Branch[];
  defaultCustomerId?: string;
  returnTo: string;
  initial?: LoanApplicationFormInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const [calc, setCalc] = useState<CalcResult>(null);

  const initialCustomer = initial
    ? customers.find((c) => c.id === initial.customerId)
    : defaultCustomerId
    ? customers.find((c) => c.id === defaultCustomerId)
    : undefined;

  const [branchFilter, setBranchFilter] = useState<string>(initialCustomer?.branchId ?? "");
  const [search, setSearch] = useState("");

  const toDateStr = (v: Date | string) => {
    const d = typeof v === "string" ? new Date(v) : v;
    return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    customerId: initial?.customerId ?? initialCustomer?.id ?? "",
    loanType: (initial?.loanType ?? "DAILY") as "DAILY" | "WEEKLY" | "MONTHLY",
    principal: initial ? String(initial.principal) : "",
    interestRate: initial ? String(initial.interestRate) : "24",
    interestMethod: "SIMPLE" as "SIMPLE" | "COMPOUND",
    ratePeriod: "ANNUAL" as "WEEKLY" | "MONTHLY" | "ANNUAL",
    processingFee: initial ? String(initial.processingFee) : "0",
    tenureCount: initial ? String(initial.tenureCount) : "100",
    startDate: initial ? toDateStr(initial.startDate) : new Date().toISOString().slice(0, 10),
    purpose: initial?.purpose ?? "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form.customerId),
    [customers, form.customerId]
  );

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (branchFilter && c.branchId !== branchFilter) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q)
      );
    });
  }, [customers, branchFilter, search]);

  // Live calculation preview whenever inputs change
  const debounced = useDebounce(
    useMemo(
      () => ({
        principal: Number(form.principal),
        interestRate: Number(form.interestRate),
        tenureCount: Number(form.tenureCount),
        loanType: form.loanType,
        processingFee: Number(form.processingFee),
        startDate: form.startDate,
        interestMethod: form.interestMethod,
        ratePeriod: form.ratePeriod,
      }),
      [
        form.principal,
        form.interestRate,
        form.tenureCount,
        form.loanType,
        form.processingFee,
        form.startDate,
        form.interestMethod,
        form.ratePeriod,
      ]
    ),
    300
  );

  useEffect(() => {
    if (!debounced.principal || !debounced.tenureCount) {
      setCalc(null);
      return;
    }
    fetch("/api/v1/loan-applications/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(debounced),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setCalc(j.data);
      })
      .catch(() => {});
  }, [debounced]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      toast.error("Please select a customer");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/loan-applications/${initial!.id}` : "/api/v1/loan-applications";
      const method = isEdit ? "PATCH" : "POST";
      // PATCH doesn't accept customerId — it's locked on edit
      const payload = isEdit
        ? {
            loanType: form.loanType,
            principal: form.principal,
            interestRate: form.interestRate,
            processingFee: form.processingFee,
            tenureCount: form.tenureCount,
            startDate: form.startDate,
            purpose: form.purpose || undefined,
            notes: form.notes || undefined,
            interestMethod: form.interestMethod,
            ratePeriod: form.ratePeriod,
          }
        : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success(
        isEdit
          ? `Application ${initial!.applicationNo} updated`
          : `Application ${json.data.applicationNo} submitted for review`
      );
      router.push(returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const tenureUnitLabel =
    form.loanType === "DAILY" ? "day(s)" : form.loanType === "WEEKLY" ? "week(s)" : "month(s)";
  const ratePeriodLabel =
    form.ratePeriod === "WEEKLY" ? "per week" : form.ratePeriod === "MONTHLY" ? "per month" : "per year";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            {/* ─── Customer search ───────────────────────────────── */}
            <div className="md:col-span-2 rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Customer *</Label>
                {selectedCustomer && (
                  <span className="text-xs text-muted-foreground">
                    Branch: {selectedCustomer.branchName ?? "—"}
                  </span>
                )}
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">
                      {selectedCustomer.customerCode} · {selectedCustomer.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground">{selectedCustomer.mobile}</div>
                  </div>
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => set("customerId", "")}
                    >
                      <X className="h-4 w-4" />
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                    >
                      <option value="">All branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} · {b.name}
                        </option>
                      ))}
                    </Select>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Search name, code or mobile…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        No customers match your search.
                      </div>
                    ) : (
                      <ul className="divide-y">
                        {filteredCustomers.slice(0, 50).map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/60"
                              onClick={() => {
                                set("customerId", c.id);
                                setBranchFilter(c.branchId);
                              }}
                            >
                              <div>
                                <div className="text-sm font-medium">
                                  {c.customerCode} · {c.fullName}
                                </div>
                                <div className="text-xs text-muted-foreground">{c.mobile}</div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {c.branchName}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {filteredCustomers.length > 50 && (
                    <p className="text-xs text-muted-foreground">
                      Showing first 50 of {filteredCustomers.length}. Refine search to narrow.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ─── Loan terms ────────────────────────────────────── */}
            <div className="space-y-2">
              <Label>Interest Method *</Label>
              <Select
                value={form.interestMethod}
                onChange={(e) => set("interestMethod", e.target.value as any)}
              >
                <option value="SIMPLE">Simple Interest</option>
                <option value="COMPOUND">Compound Interest</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate Period *</Label>
              <Select
                value={form.ratePeriod}
                onChange={(e) => set("ratePeriod", e.target.value as any)}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annually</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Principal Amount *</Label>
              <Input
                required
                type="number"
                value={form.principal}
                onChange={(e) => set("principal", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate % ({ratePeriodLabel}) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => set("interestRate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tenure Unit *</Label>
              <Select
                value={form.loanType}
                onChange={(e) => set("loanType", e.target.value as any)}
              >
                <option value="DAILY">Days</option>
                <option value="WEEKLY">Weeks</option>
                <option value="MONTHLY">Months</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenure ({tenureUnitLabel}) *</Label>
              <Input
                required
                type="number"
                value={form.tenureCount}
                onChange={(e) => set("tenureCount", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Processing Fee</Label>
              <Input
                type="number"
                value={form.processingFee}
                onChange={(e) => set("processingFee", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => set("purpose", e.target.value)}
                placeholder="e.g. Business expansion"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => history.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.customerId}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  "Save Changes"
                ) : (
                  "Submit for Review"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loan Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!calc ? (
            <p className="text-sm text-muted-foreground">Enter loan details to see calculation…</p>
          ) : (
            <>
              <Row label="Method" value={form.interestMethod === "COMPOUND" ? "Compound" : "Simple"} />
              {calc.effectiveAnnualRate != null && (
                <Row label="Effective Annual Rate" value={`${calc.effectiveAnnualRate}%`} />
              )}
              <Row label="Principal" value={formatMoney(calc.principal)} />
              <Row label="Interest Amount" value={formatMoney(calc.interestAmount)} />
              <Row label="Total Payable" value={formatMoney(calc.totalPayable)} strong />
              <Row label="Installment" value={formatMoney(calc.installmentAmount)} strong />
              <Row label="Maturity" value={new Date(calc.maturityDate).toLocaleDateString()} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? "text-base font-bold" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
