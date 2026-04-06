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
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Loader2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, User, CreditCard, History,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";

type Branch = { id: string; code: string; name: string };

type CustomerListItem = {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  branchId: string;
  branchName?: string;
};

type LoanTypeEligibility = {
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  eligible: boolean;
  reason: string;
  activeLoans: Array<{
    id: string;
    accountNo: string;
    principal: number;
    pendingAmount: number;
    status: string;
  }>;
  pendingApps: Array<{
    id: string;
    applicationNo: string;
    principal: number;
    status: string;
  }>;
};

type EligibilityData = {
  customer: any;
  applications: any[];
  loans: any[];
  eligibility: LoanTypeEligibility[];
  warnings: {
    hasOverdueLoans: boolean;
    hasNpaLoans: boolean;
    overdueCount: number;
    npaCount: number;
  };
};

type CalcResult = {
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  maturityDate: string;
  effectiveAnnualRate?: number;
} | null;

export function ExistingCustomerLoan({
  customers,
  branches,
  returnTo,
}: {
  customers: CustomerListItem[];
  branches: Branch[];
  returnTo: string;
}) {
  const router = useRouter();

  // Step 1: Customer selection
  // Step 2: Profile + eligibility
  // Step 3: Loan form
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [branchFilter, setBranchFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // Step 2 state
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [selectedLoanType, setSelectedLoanType] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "">("");

  // Step 3 state (loan form)
  const [loading, setLoading] = useState(false);
  const [calc, setCalc] = useState<CalcResult>(null);
  const [form, setForm] = useState({
    principal: "",
    interestRate: "24",
    interestMethod: "SIMPLE" as "SIMPLE" | "COMPOUND",
    ratePeriod: "ANNUAL" as "WEEKLY" | "MONTHLY" | "ANNUAL",
    processingFee: "0",
    tenureCount: "100",
    startDate: new Date().toISOString().slice(0, 10),
    purpose: "",
    notes: "",
  });

  function setF<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

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

  // Fetch eligibility when customer is selected
  async function fetchEligibility(customerId: string) {
    setEligibilityLoading(true);
    try {
      const res = await fetch(`/api/v1/customers/${customerId}/loan-eligibility`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to check eligibility");
        return;
      }
      setEligibility(json.data);
      setStep(2);
    } catch {
      toast.error("Failed to fetch customer details");
    } finally {
      setEligibilityLoading(false);
    }
  }

  function selectCustomer(id: string) {
    setSelectedCustomerId(id);
    fetchEligibility(id);
  }

  function selectLoanType(type: "DAILY" | "WEEKLY" | "MONTHLY") {
    setSelectedLoanType(type);
    // Reset form with loan type default tenure
    setForm((f) => ({
      ...f,
      tenureCount: type === "DAILY" ? "100" : type === "WEEKLY" ? "12" : "6",
    }));
    setStep(3);
  }

  function goBackToSearch() {
    setStep(1);
    setSelectedCustomerId("");
    setEligibility(null);
    setSelectedLoanType("");
    setCalc(null);
  }

  function goBackToEligibility() {
    setStep(2);
    setSelectedLoanType("");
    setCalc(null);
  }

  // Live calculation
  const debounced = useDebounce(
    useMemo(
      () => ({
        principal: Number(form.principal),
        interestRate: Number(form.interestRate),
        tenureCount: Number(form.tenureCount),
        loanType: selectedLoanType || "DAILY",
        processingFee: Number(form.processingFee),
        startDate: form.startDate,
        interestMethod: form.interestMethod,
        ratePeriod: form.ratePeriod,
      }),
      [form, selectedLoanType]
    ),
    300
  );

  useEffect(() => {
    if (step !== 3 || !debounced.principal || !debounced.tenureCount) {
      setCalc(null);
      return;
    }
    fetch("/api/v1/loan-applications/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(debounced),
    })
      .then((r) => r.json())
      .then((j) => { if (j.data) setCalc(j.data); })
      .catch(() => {});
  }, [debounced, step]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId || !selectedLoanType) {
      toast.error("Invalid state — please start over");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/loan-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          loanType: selectedLoanType,
          ...form,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to submit application");
        return;
      }
      toast.success(`Application ${json.data.applicationNo} submitted for review`);
      router.push(returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const tenureUnitLabel =
    selectedLoanType === "DAILY" ? "day(s)" : selectedLoanType === "WEEKLY" ? "week(s)" : "month(s)";
  const ratePeriodLabel =
    form.ratePeriod === "WEEKLY" ? "per week" : form.ratePeriod === "MONTHLY" ? "per month" : "per year";

  // ─── Step 1: Customer Search ─────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Existing Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} · {b.name}</option>
                ))}
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by name, code, or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {eligibilityLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading customer details...
              </div>
            )}

            {!eligibilityLoading && (
              <div className="max-h-[28rem] overflow-y-auto rounded-md border">
                {filteredCustomers.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No customers match your search.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.slice(0, 50).map((c) => (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/60">
                          <TableCell className="font-mono text-xs">{c.customerCode}</TableCell>
                          <TableCell className="font-medium">{c.fullName}</TableCell>
                          <TableCell>{c.mobile}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.branchName}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => selectCustomer(c.id)}>
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {filteredCustomers.length > 50 && (
              <p className="text-xs text-muted-foreground">
                Showing first 50 of {filteredCustomers.length}. Refine your search to see more.
              </p>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  // ─── Step 2: Customer Profile + Eligibility ──────────────────────────
  if (step === 2 && eligibility) {
    const { customer, applications, loans, eligibility: types, warnings } = eligibility;
    return (
      <div className="space-y-4">
        {/* Warnings banner */}
        {(warnings.hasOverdueLoans || warnings.hasNpaLoans) && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                {warnings.hasOverdueLoans && (
                  <p className="font-medium text-destructive">
                    This customer has {warnings.overdueCount} overdue loan{warnings.overdueCount > 1 ? "s" : ""}. Proceed with caution.
                  </p>
                )}
                {warnings.hasNpaLoans && (
                  <p className="font-medium text-destructive">
                    This customer has {warnings.npaCount} NPA (Non-Performing Asset) loan{warnings.npaCount > 1 ? "s" : ""}. Loan approval may be restricted.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ProfileField label="Code" value={customer.customerCode} />
              <ProfileField label="Full Name" value={customer.fullName} />
              <ProfileField label="Mobile" value={customer.mobile} />
              <ProfileField label="Branch" value={`${customer.branch?.code} · ${customer.branch?.name}`} />
              <ProfileField label="Father / Husband" value={customer.fatherOrHusband} />
              <ProfileField label="Aadhaar" value={customer.aadhaar} />
              <ProfileField label="PAN / Tax ID" value={customer.panOrTaxId} />
              <ProfileField label="Occupation" value={customer.occupation} />
              <ProfileField label="Monthly Income" value={customer.monthlyIncome ? formatMoney(customer.monthlyIncome) : null} />
              <ProfileField label="Current Address" value={customer.currentAddress} className="sm:col-span-2 lg:col-span-3" />
            </div>
          </CardContent>
        </Card>

        {/* Loan History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Loan History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 && applications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No loan history for this customer.</p>
            ) : (
              <div className="space-y-4">
                {loans.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Loan Accounts</h4>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account No</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Principal</TableHead>
                            <TableHead>Paid</TableHead>
                            <TableHead>Pending</TableHead>
                            <TableHead>Overdue</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loans.map((l: any) => (
                            <TableRow key={l.id}>
                              <TableCell className="font-mono text-xs">{l.accountNo}</TableCell>
                              <TableCell>{l.loanType}</TableCell>
                              <TableCell>{formatMoney(l.principal)}</TableCell>
                              <TableCell>{formatMoney(l.paidAmount)}</TableCell>
                              <TableCell>{formatMoney(l.pendingAmount)}</TableCell>
                              <TableCell>{formatMoney(l.overdueAmount)}</TableCell>
                              <TableCell><StatusBadge status={l.status} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {applications.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Applications</h4>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>App No</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Principal</TableHead>
                            <TableHead>Installment</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {applications.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-mono text-xs">{a.applicationNo}</TableCell>
                              <TableCell>{a.loanType}</TableCell>
                              <TableCell>{formatMoney(a.principal)}</TableCell>
                              <TableCell>{formatMoney(a.installmentAmount)}</TableCell>
                              <TableCell><StatusBadge status={a.status} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loan Type Eligibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Available Loan Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {types.map((t) => (
                <div
                  key={t.type}
                  className={
                    "relative rounded-lg border p-4 transition-colors " +
                    (t.eligible
                      ? "border-border hover:border-primary cursor-pointer"
                      : "border-border bg-muted/40 opacity-70")
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t.type} Loan</h4>
                    {t.eligible ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t.type === "DAILY" && "Repayment collected daily"}
                    {t.type === "WEEKLY" && "Repayment collected weekly"}
                    {t.type === "MONTHLY" && "Repayment collected monthly"}
                  </p>
                  {t.eligible ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => selectLoanType(t.type)}
                    >
                      Apply {t.type} Loan
                    </Button>
                  ) : (
                    <p className="text-xs text-destructive font-medium">{t.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={goBackToSearch}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Change Customer
        </Button>
      </div>
    );
  }

  // ─── Step 3: Loan Application Form ───────────────────────────────────
  if (step === 3 && eligibility && selectedLoanType) {
    const { customer, warnings } = eligibility;
    return (
      <div className="space-y-4">
        {/* Customer summary bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{customer.customerCode} · {customer.fullName}</p>
                <p className="text-xs text-muted-foreground">{customer.mobile} · {customer.branch?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {selectedLoanType} Loan
              </Badge>
              {warnings.hasOverdueLoans && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Overdue
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Loan Application — {selectedLoanType} Type</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Interest Method *</Label>
                  <Select value={form.interestMethod} onChange={(e) => setF("interestMethod", e.target.value as any)}>
                    <option value="SIMPLE">Simple Interest</option>
                    <option value="COMPOUND">Compound Interest</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rate Period *</Label>
                  <Select value={form.ratePeriod} onChange={(e) => setF("ratePeriod", e.target.value as any)}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annually</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Principal Amount *</Label>
                  <Input required type="number" value={form.principal} onChange={(e) => setF("principal", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate % ({ratePeriodLabel}) *</Label>
                  <Input required type="number" step="0.01" value={form.interestRate} onChange={(e) => setF("interestRate", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Tenure ({tenureUnitLabel}) *</Label>
                  <Input required type="number" value={form.tenureCount} onChange={(e) => setF("tenureCount", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Processing Fee</Label>
                  <Input type="number" value={form.processingFee} onChange={(e) => setF("processingFee", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input required type="date" value={form.startDate} onChange={(e) => setF("startDate", e.target.value)} />
                </div>
                <div />

                <div className="space-y-2 md:col-span-2">
                  <Label>Purpose</Label>
                  <Input value={form.purpose} onChange={(e) => setF("purpose", e.target.value)} placeholder="e.g. Business expansion" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={goBackToEligibility}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Review"}
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
                <p className="text-sm text-muted-foreground">Enter loan details to see calculation...</p>
              ) : (
                <>
                  <Row label="Loan Type" value={selectedLoanType} />
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
      </div>
    );
  }

  return null;
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
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
