"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

type LoanType = "DAILY" | "WEEKLY" | "MONTHLY";

export interface LoanDetailsInitial {
  id: string;
  loanType: LoanType;
  principal: number;
  interestRate: number;
  processingFee: number;
  tenureCount: number;
  installmentAmount: number;
  totalPayable: number;
  interestAmount: number;
  startDate: Date | string;
  maturityDate: Date | string;
  purpose?: string | null;
  notes?: string | null;
}

type CalcPreview = {
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  maturityDate: string;
} | null;

const toDateStr = (v: Date | string) => {
  const d = typeof v === "string" ? new Date(v) : v;
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export function LoanDetailsEditable({
  app,
  canEdit,
}: {
  app: LoanDetailsInitial;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calc, setCalc] = useState<CalcPreview>(null);

  const [form, setForm] = useState({
    loanType: app.loanType,
    principal: String(app.principal),
    interestRate: String(app.interestRate),
    processingFee: String(app.processingFee),
    tenureCount: String(app.tenureCount),
    startDate: toDateStr(app.startDate),
    purpose: app.purpose ?? "",
    notes: app.notes ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm({
      loanType: app.loanType,
      principal: String(app.principal),
      interestRate: String(app.interestRate),
      processingFee: String(app.processingFee),
      tenureCount: String(app.tenureCount),
      startDate: toDateStr(app.startDate),
      purpose: app.purpose ?? "",
      notes: app.notes ?? "",
    });
    setCalc(null);
    setEditing(false);
  }

  const previewKey = useMemo(
    () =>
      JSON.stringify({
        p: form.principal,
        r: form.interestRate,
        t: form.tenureCount,
        l: form.loanType,
        f: form.processingFee,
        d: form.startDate,
      }),
    [form.principal, form.interestRate, form.tenureCount, form.loanType, form.processingFee, form.startDate]
  );

  useEffect(() => {
    if (!editing) return;
    const principal = Number(form.principal);
    const tenureCount = Number(form.tenureCount);
    if (!principal || !tenureCount) {
      setCalc(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/v1/loan-applications/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal,
          interestRate: Number(form.interestRate),
          tenureCount,
          loanType: form.loanType,
          processingFee: Number(form.processingFee),
          startDate: form.startDate,
          interestMethod: "SIMPLE",
          ratePeriod: "ANNUAL",
        }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.data) setCalc(j.data);
        })
        .catch(() => {});
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [editing, previewKey, form.interestRate, form.loanType, form.processingFee, form.startDate]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/loan-applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanType: form.loanType,
          principal: form.principal,
          interestRate: form.interestRate,
          processingFee: form.processingFee,
          tenureCount: form.tenureCount,
          startDate: form.startDate,
          purpose: form.purpose || undefined,
          notes: form.notes || undefined,
          interestMethod: "SIMPLE",
          ratePeriod: "ANNUAL",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update");
        return;
      }
      toast.success("Loan details updated");
      setEditing(false);
      setCalc(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Loan Details</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Row label="Loan Type" value={app.loanType} />
          <Row label="Tenure" value={`${app.tenureCount} installments`} />
          <Row label="Principal" value={formatMoney(app.principal)} />
          <Row label="Interest Rate" value={`${app.interestRate}%`} />
          <Row label="Interest Amount" value={formatMoney(app.interestAmount)} />
          <Row label="Processing Fee" value={formatMoney(app.processingFee)} />
          <Row label="Installment" value={formatMoney(app.installmentAmount)} strong />
          <Row label="Total Payable" value={formatMoney(app.totalPayable)} strong />
          <Row label="Start Date" value={fmtDate(app.startDate)} />
          <Row label="Maturity" value={fmtDate(app.maturityDate)} />
          <Row label="Purpose" value={app.purpose ?? "—"} wide />
          <Row label="Notes" value={app.notes ?? "—"} wide />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Edit Loan Details</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Loan Type</Label>
          <Select value={form.loanType} onChange={(e) => set("loanType", e.target.value)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tenure (installments)</Label>
          <Input
            type="number"
            min={1}
            value={form.tenureCount}
            onChange={(e) => set("tenureCount", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Principal</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.principal}
            onChange={(e) => set("principal", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Interest Rate (% annual)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.interestRate}
            onChange={(e) => set("interestRate", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Processing Fee</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.processingFee}
            onChange={(e) => set("processingFee", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Start Date</Label>
          <Input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Purpose</Label>
          <Input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="md:col-span-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Live Recalculation Preview
          </div>
          {calc ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Row label="Installment" value={formatMoney(calc.installmentAmount)} strong />
              <Row label="Interest" value={formatMoney(calc.interestAmount)} />
              <Row label="Total Payable" value={formatMoney(calc.totalPayable)} strong />
              <Row label="Maturity" value={fmtDate(calc.maturityDate)} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Enter principal and tenure to see recalculated values.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  strong,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={"mt-1 " + (strong ? "text-base font-bold" : "text-sm font-medium")}>{value}</div>
    </div>
  );
}
