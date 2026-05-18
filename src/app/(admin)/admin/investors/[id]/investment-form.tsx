"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

type PayoutMode = "MONTHLY_INTEREST" | "MONTHLY_EMI" | "CUSTOM";
type PayoutFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "MATURITY";

const FREQUENCY_MONTHS: Record<PayoutFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
  MATURITY: 0, // single payout at maturity
};

type CustomRow = { dueDate: string; principalDue: string; interestDue: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // handle month-end overflow
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export default function InvestmentForm({ investorId }: { investorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    principalAmount: "",
    interestRate: "",
    tenureMonths: "",
    investmentDate: new Date().toISOString().slice(0, 10),
    agreementDate: "",
    payoutMode: "MONTHLY_INTEREST" as PayoutMode,
    notes: "",
  });
  const [frequency, setFrequency] = useState<PayoutFrequency>("MONTHLY");
  const [selfCalc, setSelfCalc] = useState(false);
  const [manual, setManual] = useState({
    perPayoutInterest: "",
    totalInterest: "",
    totalReturn: "",
  });
  const [customRows, setCustomRows] = useState<CustomRow[]>([
    { dueDate: "", principalDue: "0", interestDue: "0" },
  ]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /**
   * Build a frequency-driven payout schedule for MONTHLY_INTEREST mode.
   * MATURITY → single payout at end. Otherwise, payouts every N months;
   * any leftover stub at the end is bundled into the maturity payout.
   * `perPayoutInterest` lets self-calc override the formula-derived amount.
   */
  function buildFrequencySchedule(
    P: number,
    R: number,
    N: number,
    freq: PayoutFrequency,
    startIso: string,
    overrides?: { perPayoutInterest?: number; totalInterest?: number },
  ): CustomRow[] {
    if (!P || !N || !startIso) return [];
    const stepMonths = FREQUENCY_MONTHS[freq];
    if (freq === "MATURITY") {
      const totalI =
        overrides?.totalInterest ??
        (overrides?.perPayoutInterest != null
          ? overrides.perPayoutInterest
          : (P * R * N) / 1200);
      return [
        {
          dueDate: addMonths(startIso, N),
          principalDue: String(P),
          interestDue: String(round2(totalI)),
        },
      ];
    }
    const fullCount = Math.floor(N / stepMonths);
    const remainder = N - fullCount * stepMonths;
    const formulaPerPayout = (P * R * stepMonths) / 1200;
    const perPayout =
      overrides?.perPayoutInterest != null
        ? overrides.perPayoutInterest
        : formulaPerPayout;
    const rows: CustomRow[] = [];
    for (let i = 1; i <= fullCount; i++) {
      const isLastFull = i === fullCount && remainder === 0;
      rows.push({
        dueDate: addMonths(startIso, i * stepMonths),
        principalDue: isLastFull ? String(P) : "0",
        interestDue: String(round2(perPayout)),
      });
    }
    if (remainder > 0) {
      const stubInterest = (P * R * remainder) / 1200;
      const stubPer =
        overrides?.perPayoutInterest != null
          ? (overrides.perPayoutInterest * remainder) / stepMonths
          : stubInterest;
      rows.push({
        dueDate: addMonths(startIso, N),
        principalDue: String(P),
        interestDue: String(round2(stubPer)),
      });
    }
    // If admin gave a totalInterest override, redistribute proportionally.
    if (overrides?.totalInterest != null && rows.length > 0) {
      const sum = rows.reduce((s, r) => s + Number(r.interestDue || 0), 0);
      if (sum > 0) {
        const factor = overrides.totalInterest / sum;
        let acc = 0;
        rows.forEach((r, idx) => {
          if (idx === rows.length - 1) {
            r.interestDue = String(round2(overrides.totalInterest! - acc));
          } else {
            const v = round2(Number(r.interestDue) * factor);
            r.interestDue = String(v);
            acc = round2(acc + v);
          }
        });
      }
    }
    return rows;
  }

  /** Live preview of computed totals so the admin sees what gets recorded. */
  const preview = useMemo(() => {
    const P = Number(form.principalAmount) || 0;
    const R = Number(form.interestRate) || 0;
    const N = Number(form.tenureMonths) || 0;
    if (!P || !N) return null;
    if (form.payoutMode === "MONTHLY_INTEREST") {
      const overrides = selfCalc
        ? {
            perPayoutInterest:
              manual.perPayoutInterest !== ""
                ? Number(manual.perPayoutInterest)
                : undefined,
            totalInterest:
              manual.totalInterest !== ""
                ? Number(manual.totalInterest)
                : undefined,
          }
        : undefined;
      const rows = buildFrequencySchedule(P, R, N, frequency, form.investmentDate, overrides);
      const totalI = rows.reduce((s, r) => s + Number(r.interestDue || 0), 0);
      const perPayout = rows.length ? Number(rows[0].interestDue) : 0;
      const totalReturnOverride =
        selfCalc && manual.totalReturn !== "" ? Number(manual.totalReturn) : null;
      const totalReturn = totalReturnOverride ?? P + totalI;
      const freqLabel =
        frequency === "MONTHLY"
          ? "Monthly"
          : frequency === "QUARTERLY"
          ? "Quarterly"
          : frequency === "HALF_YEARLY"
          ? "Half-yearly"
          : frequency === "YEARLY"
          ? "Yearly"
          : "At maturity";
      return {
        monthly: perPayout,
        totalInterest: totalI,
        totalReturn,
        note: `${freqLabel} interest · ${rows.length} payout${rows.length === 1 ? "" : "s"}${
          selfCalc ? " · self-calc override" : ""
        }; principal at maturity.`,
      };
    }
    if (form.payoutMode === "MONTHLY_EMI") {
      const r = R / 1200;
      const emi = r === 0 ? P / N : (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
      const total = emi * N;
      const overrideTotalReturn =
        selfCalc && manual.totalReturn !== "" ? Number(manual.totalReturn) : null;
      const overrideTotalInterest =
        selfCalc && manual.totalInterest !== "" ? Number(manual.totalInterest) : null;
      return {
        monthly: emi,
        totalInterest: overrideTotalInterest ?? total - P,
        totalReturn: overrideTotalReturn ?? total,
        note: `EMI ${formatMoney(emi)} for ${N} months${selfCalc ? " · self-calc override" : ""}.`,
      };
    }
    // CUSTOM
    const totalI = customRows.reduce((s, r) => s + Number(r.interestDue || 0), 0);
    const totalP = customRows.reduce((s, r) => s + Number(r.principalDue || 0), 0);
    return {
      monthly: 0,
      totalInterest: totalI,
      totalReturn: (totalP > 0 ? totalP : P) + totalI,
      note: `${customRows.length} custom rows · principal ${formatMoney(totalP)} · interest ${formatMoney(totalI)}`,
    };
  }, [form, customRows, frequency, selfCalc, manual]);

  function addRow() {
    setCustomRows((r) => [...r, { dueDate: "", principalDue: "0", interestDue: "0" }]);
  }
  function removeRow(i: number) {
    setCustomRows((r) => r.filter((_, idx) => idx !== i));
  }
  function setRow(i: number, k: keyof CustomRow, v: string) {
    setCustomRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.payoutMode === "CUSTOM") {
      if (customRows.length === 0)
        return toast.error("Add at least one custom payout row");
      if (customRows.some((r) => !r.dueDate))
        return toast.error("All custom payout rows need a due date");
    }

    // For MONTHLY_INTEREST: if a non-monthly frequency or self-calc override is
    // in play, generate a CUSTOM schedule and submit under that mode so the
    // backend persists the exact dates/amounts the admin sees in the preview.
    const useCustomFromFrequency =
      form.payoutMode === "MONTHLY_INTEREST" &&
      (frequency !== "MONTHLY" ||
        (selfCalc &&
          (manual.perPayoutInterest !== "" || manual.totalInterest !== "")));

    let effectiveMode: PayoutMode = form.payoutMode;
    let effectiveCustomPayouts:
      | { dueDate: string; principalDue: number; interestDue: number }[]
      | undefined;

    if (useCustomFromFrequency) {
      const generated = buildFrequencySchedule(
        Number(form.principalAmount),
        Number(form.interestRate),
        Number(form.tenureMonths),
        frequency,
        form.investmentDate,
        selfCalc
          ? {
              perPayoutInterest:
                manual.perPayoutInterest !== ""
                  ? Number(manual.perPayoutInterest)
                  : undefined,
              totalInterest:
                manual.totalInterest !== ""
                  ? Number(manual.totalInterest)
                  : undefined,
            }
          : undefined,
      );
      if (generated.length === 0)
        return toast.error("Could not build payout schedule — check inputs");
      effectiveMode = "CUSTOM";
      effectiveCustomPayouts = generated.map((r) => ({
        dueDate: r.dueDate,
        principalDue: Number(r.principalDue || 0),
        interestDue: Number(r.interestDue || 0),
      }));
    } else if (form.payoutMode === "CUSTOM") {
      effectiveCustomPayouts = customRows.map((r) => ({
        dueDate: r.dueDate,
        principalDue: Number(r.principalDue || 0),
        interestDue: Number(r.interestDue || 0),
      }));
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/investors/${investorId}/investments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId,
          principalAmount: Number(form.principalAmount),
          interestRate: Number(form.interestRate),
          tenureMonths: Number(form.tenureMonths),
          investmentDate: form.investmentDate,
          payoutMode: effectiveMode,
          agreementDate: form.agreementDate || null,
          notes: form.notes || null,
          customPayouts: effectiveCustomPayouts,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add investment");
        return;
      }
      toast.success("Investment added with payout schedule");
      setForm({
        principalAmount: "",
        interestRate: "",
        tenureMonths: "",
        investmentDate: new Date().toISOString().slice(0, 10),
        agreementDate: "",
        payoutMode: "MONTHLY_INTEREST",
        notes: "",
      });
      setCustomRows([{ dueDate: "", principalDue: "0", interestDue: "0" }]);
      setFrequency("MONTHLY");
      setSelfCalc(false);
      setManual({ perPayoutInterest: "", totalInterest: "", totalReturn: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Principal Amount *</Label>
          <Input
            type="number"
            required
            min={1}
            value={form.principalAmount}
            onChange={(e) => set("principalAmount", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Interest Rate (% p.a.) *</Label>
          <Input
            type="number"
            required
            min={0}
            max={100}
            step="0.01"
            value={form.interestRate}
            onChange={(e) => set("interestRate", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Tenure (months) *</Label>
          <Input
            type="number"
            required
            min={1}
            value={form.tenureMonths}
            onChange={(e) => set("tenureMonths", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Investment Date *</Label>
          <Input
            type="date"
            required
            value={form.investmentDate}
            onChange={(e) => set("investmentDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Payout Mode *</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            value={form.payoutMode}
            onChange={(e) => set("payoutMode", e.target.value as PayoutMode)}
          >
            <option value="MONTHLY_INTEREST">Monthly Interest (principal at maturity)</option>
            <option value="MONTHLY_EMI">Monthly EMI (principal + interest)</option>
            <option value="CUSTOM">Custom (manual schedule)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Agreement Date</Label>
          <Input
            type="date"
            value={form.agreementDate}
            onChange={(e) => set("agreementDate", e.target.value)}
          />
        </div>
        {form.payoutMode === "MONTHLY_INTEREST" && (
          <div className="space-y-2">
            <Label>Interest Payout Months *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as PayoutFrequency)}
            >
              <option value="MONTHLY">Every month</option>
              <option value="QUARTERLY">Every 3 months (quarterly)</option>
              <option value="HALF_YEARLY">Every 6 months (half-yearly)</option>
              <option value="YEARLY">Every 12 months (yearly)</option>
              <option value="MATURITY">Only at maturity</option>
            </select>
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional notes"
          />
        </div>
      </div>

      {form.payoutMode !== "CUSTOM" && (
        <div className="rounded-md border bg-muted/20 p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selfCalc}
              onChange={(e) => setSelfCalc(e.target.checked)}
            />
            Self-calculation (manual override of computed amounts)
          </label>
          {selfCalc && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {form.payoutMode === "MONTHLY_INTEREST" && frequency !== "MATURITY" && (
                <div className="space-y-1">
                  <Label className="text-xs">Per-payout interest</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="auto"
                    value={manual.perPayoutInterest}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, perPayoutInterest: e.target.value }))
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Total interest</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="auto"
                  value={manual.totalInterest}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, totalInterest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total return</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="auto"
                  value={manual.totalReturn}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, totalReturn: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            Leave fields blank to keep the auto-calculated value. Manual amounts override the formula and are persisted in the payout schedule.
          </div>
        </div>
      )}

      {form.payoutMode === "CUSTOM" && (
        <div className="rounded-md border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Custom Payout Schedule</div>
              <div className="text-xs text-muted-foreground">
                Add a row per payout. Principal sum should equal the principal amount; interest is what you owe the investor.
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
            </Button>
          </div>
          <div className="space-y-2">
            {customRows.map((r, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-12">
                <div className="md:col-span-1 self-center text-xs text-muted-foreground">#{i + 1}</div>
                <div className="md:col-span-3">
                  <Input
                    type="date"
                    required
                    value={r.dueDate}
                    onChange={(e) => setRow(i, "dueDate", e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Principal"
                    value={r.principalDue}
                    onChange={(e) => setRow(i, "principalDue", e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Interest"
                    value={r.interestDue}
                    onChange={(e) => setRow(i, "interestDue", e.target.value)}
                  />
                </div>
                <div className="md:col-span-1 self-center text-right text-xs font-mono">
                  {formatMoney(Number(r.principalDue || 0) + Number(r.interestDue || 0))}
                </div>
                <div className="md:col-span-1 self-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(i)}
                    disabled={customRows.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="rounded-md border bg-primary/5 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {form.payoutMode !== "CUSTOM" && (
              <span>
                <b>Per month:</b> {formatMoney(preview.monthly)}
              </span>
            )}
            <span>
              <b>Total interest:</b> {formatMoney(preview.totalInterest)}
            </span>
            <span>
              <b>Total return:</b> {formatMoney(preview.totalReturn)}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{preview.note}</div>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Investment"}
        </Button>
      </div>
    </form>
  );
}
