"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RotateCcw, Printer } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { fmtDate } from "@/lib/dayjs";

type LoanType = "DAILY" | "WEEKLY" | "MONTHLY";
type InterestMethod = "SIMPLE" | "COMPOUND";
type RatePeriod = "WEEKLY" | "MONTHLY" | "ANNUAL";

type CalcResult = {
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  maturityDate: string;
  effectiveAnnualRate?: number;
} | null;

type ScheduleRow = {
  installmentNo: number;
  dueDate: Date;
  dueAmount: number;
};

const DEFAULTS = {
  loanType: "DAILY" as LoanType,
  principal: "",
  interestRate: "24",
  interestMethod: "SIMPLE" as InterestMethod,
  ratePeriod: "ANNUAL" as RatePeriod,
  processingFee: "0",
  tenureCount: "100",
  installmentAmount: "",
  startDate: new Date().toISOString().slice(0, 10),
};

export function LoanCalculatorTool() {
  const [loan, setLoan] = useState(DEFAULTS);
  const [calc, setCalc] = useState<CalcResult>(null);
  const [loading, setLoading] = useState(false);
  const [emiManual, setEmiManual] = useState(false);
  const [selfCalc, setSelfCalc] = useState(false);
  const [manualInterest, setManualInterest] = useState("");
  const [manualTotal, setManualTotal] = useState("");

  function setL<K extends keyof typeof loan>(k: K, v: (typeof loan)[K]) {
    setLoan((f) => ({ ...f, [k]: v }));
  }

  const debounced = useDebounce(
    useMemo(
      () => ({
        principal: Number(loan.principal),
        interestRate: Number(loan.interestRate),
        tenureCount: Number(loan.tenureCount),
        loanType: loan.loanType,
        processingFee: Number(loan.processingFee),
        startDate: loan.startDate,
        interestMethod: loan.interestMethod,
        ratePeriod: loan.ratePeriod,
      }),
      [loan]
    ),
    300
  );

  useEffect(() => {
    if (selfCalc) return; // skip auto-calc in self-calculate mode
    if (!debounced.principal || !debounced.tenureCount) {
      setCalc(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/v1/loan-applications/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(debounced),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setCalc(j.data);
          if (!emiManual) {
            setLoan((prev) => ({ ...prev, installmentAmount: String(j.data.installmentAmount) }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debounced, emiManual, selfCalc]);

  // Schedule rows — built from whatever totals are active (auto-calc OR self-calc)
  const schedule: ScheduleRow[] = useMemo(() => {
    const tenureCount = Number(loan.tenureCount);
    if (!tenureCount) return [];
    let installment = 0;
    let total = 0;
    if (selfCalc) {
      installment = Number(loan.installmentAmount);
      total = Number(manualTotal);
      if (!installment || !total) return [];
    } else {
      if (!calc) return [];
      installment = emiManual ? Number(loan.installmentAmount) : calc.installmentAmount;
      total = calc.totalPayable;
    }
    return buildSchedule({
      startDate: new Date(loan.startDate),
      loanType: loan.loanType,
      tenureCount,
      installmentAmount: installment,
      totalPayable: total,
    });
  }, [selfCalc, calc, loan, emiManual, manualTotal]);

  function reset() {
    setLoan(DEFAULTS);
    setSelfCalc(false);
    setEmiManual(false);
    setManualInterest("");
    setManualTotal("");
    setCalc(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Loan Details</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selfCalc}
                  onCheckedChange={(checked) => {
                    setSelfCalc(checked);
                    if (!checked) {
                      setManualInterest("");
                      setManualTotal("");
                      setCalc(null);
                    }
                  }}
                />
                <label
                  className="cursor-pointer text-sm font-medium"
                  onClick={() => {
                    const next = !selfCalc;
                    setSelfCalc(next);
                    if (!next) {
                      setManualInterest("");
                      setManualTotal("");
                      setCalc(null);
                    }
                  }}
                >
                  Self Calculate
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {!selfCalc && (
              <>
                <div className="space-y-2">
                  <Label>Interest Method *</Label>
                  <Select value={loan.interestMethod} onChange={(e) => setL("interestMethod", e.target.value as InterestMethod)}>
                    <option value="SIMPLE">Simple Interest</option>
                    <option value="COMPOUND">Compound Interest</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rate Period *</Label>
                  <Select value={loan.ratePeriod} onChange={(e) => setL("ratePeriod", e.target.value as RatePeriod)}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annually</option>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Principal Amount *</Label>
              <Input required type="number" value={loan.principal} onChange={(e) => setL("principal", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Interest Rate % *</Label>
              <Input required type="number" step="0.01" value={loan.interestRate} onChange={(e) => setL("interestRate", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tenure Unit *</Label>
              <Select value={loan.loanType} onChange={(e) => setL("loanType", e.target.value as LoanType)}>
                <option value="DAILY">Days</option>
                <option value="WEEKLY">Weeks</option>
                <option value="MONTHLY">Months</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tenure Count *</Label>
              <Input required type="number" value={loan.tenureCount} onChange={(e) => setL("tenureCount", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Processing Fee</Label>
              <Input type="number" value={loan.processingFee} onChange={(e) => setL("processingFee", e.target.value)} />
            </div>

            {selfCalc ? (
              <>
                <div className="space-y-2">
                  <Label>Interest Amount *</Label>
                  <Input
                    type="number"
                    placeholder="Enter interest amount"
                    value={manualInterest}
                    onChange={(e) => {
                      setManualInterest(e.target.value);
                      if (loan.principal && e.target.value) {
                        setManualTotal(String(Number(loan.principal) + Number(e.target.value)));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Payable *</Label>
                  <Input
                    type="number"
                    placeholder="Enter total payable"
                    value={manualTotal}
                    onChange={(e) => setManualTotal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>EMI / Installment *</Label>
                  <Input
                    type="number"
                    placeholder="Enter installment amount"
                    value={loan.installmentAmount}
                    onChange={(e) => setL("installmentAmount", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>EMI / Installment</Label>
                <Input
                  type="number"
                  placeholder={calc ? String(calc.installmentAmount) : "Auto-calculated"}
                  value={loan.installmentAmount}
                  onChange={(e) => {
                    setL("installmentAmount", e.target.value);
                    setEmiManual(!!e.target.value);
                  }}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input required type="date" value={loan.startDate} onChange={(e) => setL("startDate", e.target.value)} />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              {schedule.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repayment Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Enter loan details to generate a schedule.
              </p>
            ) : (
              <div className="max-h-[480px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((row) => (
                      <TableRow key={row.installmentNo}>
                        <TableCell className="font-mono text-xs">{row.installmentNo}</TableCell>
                        <TableCell>{fmtDate(row.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(row.dueAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Loan Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selfCalc ? (
              loan.principal ? (
                <>
                  <Row label="Mode" value="Self Calculate" />
                  <Row label="Principal" value={formatMoney(Number(loan.principal))} />
                  <Row label="Interest" value={manualInterest ? formatMoney(Number(manualInterest)) : "—"} />
                  <Row label="Total Payable" value={manualTotal ? formatMoney(Number(manualTotal)) : "—"} strong />
                  <Row label="Installment" value={loan.installmentAmount ? formatMoney(Number(loan.installmentAmount)) : "—"} strong />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter loan details to preview…</p>
              )
            ) : loading && !calc ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating…
              </div>
            ) : !calc ? (
              <p className="text-sm text-muted-foreground">Enter principal and tenure to preview…</p>
            ) : (
              <>
                <Row label="Principal" value={formatMoney(calc.principal)} />
                <Row label="Interest" value={formatMoney(calc.interestAmount)} />
                <Row label="Total Payable" value={formatMoney(calc.totalPayable)} strong />
                <Row label="Installment" value={formatMoney(emiManual ? Number(loan.installmentAmount) : calc.installmentAmount)} strong />
                <Row label="Maturity" value={new Date(calc.maturityDate).toLocaleDateString()} />
                {calc.effectiveAnnualRate != null && (
                  <Row label="Effective Annual" value={`${calc.effectiveAnnualRate}%`} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
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

function buildSchedule(params: {
  startDate: Date;
  loanType: LoanType;
  tenureCount: number;
  installmentAmount: number;
  totalPayable: number;
}): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const normal = Math.round(params.installmentAmount);
  const total = Math.round(params.totalPayable);
  const lastAmount = total - normal * (params.tenureCount - 1);
  for (let i = 1; i <= params.tenureCount; i++) {
    rows.push({
      installmentNo: i,
      dueDate: addUnits(params.startDate, params.loanType, i - 1),
      dueAmount: i === params.tenureCount ? lastAmount : normal,
    });
  }
  return rows;
}

function addUnits(start: Date, loanType: LoanType, n: number): Date {
  const d = new Date(start);
  if (loanType === "DAILY") d.setDate(d.getDate() + n);
  else if (loanType === "WEEKLY") d.setDate(d.getDate() + n * 7);
  else d.setMonth(d.getMonth() + n);
  return d;
}

function useDebounce<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
