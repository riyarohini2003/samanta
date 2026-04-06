"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { PhotoCapture } from "@/components/ui/photo-capture";
import { DocumentSlot, type UploadedDoc } from "@/components/ui/document-upload";
import { formatMoney } from "@/lib/formatters";

type Branch = { id: string; code: string; name: string };

type CalcResult = {
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  maturityDate: string;
  effectiveAnnualRate?: number;
} | null;

export function CustomerLoanIntake({
  branches,
  defaultBranchId,
  successRedirect,
}: {
  branches: Branch[];
  defaultBranchId?: string;
  /** Where to navigate after successful submit, e.g. "/admin/dashboard" */
  successRedirect: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [calc, setCalc] = useState<CalcResult>(null);

  const [customer, setCustomer] = useState({
    fullName: "",
    fatherOrHusband: "",
    mobile: "",
    altMobile: "",
    aadhaar: "",
    panOrTaxId: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    occupation: "",
    monthlyIncome: "",
    currentAddress: "",
    permanentAddress: "",
    guarantorName: "",
    guarantorMobile: "",
    guarantorRelation: "",
    referenceName: "",
    referenceMobile: "",
    bankName: "",
    bankAccount: "",
    ifsc: "",
    nomineeName: "",
    nomineeRelation: "",
    branchId: defaultBranchId ?? branches[0]?.id ?? "",
  });

  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  // Customer KYC doc slots
  const [aadhaarFront, setAadhaarFront] = useState<UploadedDoc | undefined>();
  const [aadhaarBack, setAadhaarBack] = useState<UploadedDoc | undefined>();
  const [panDoc, setPanDoc] = useState<UploadedDoc | undefined>();
  const [signatureDoc, setSignatureDoc] = useState<UploadedDoc | undefined>();

  // Loan supporting docs
  const [incomeProof, setIncomeProof] = useState<UploadedDoc | undefined>();
  const [bankStatement, setBankStatement] = useState<UploadedDoc | undefined>();
  const [otherLoanDoc, setOtherLoanDoc] = useState<UploadedDoc | undefined>();

  const [loan, setLoan] = useState({
    loanType: "DAILY" as "DAILY" | "WEEKLY" | "MONTHLY",
    principal: "",
    interestRate: "24",
    interestMethod: "SIMPLE" as "SIMPLE" | "COMPOUND",
    ratePeriod: "ANNUAL" as "WEEKLY" | "MONTHLY" | "ANNUAL",
    processingFee: "0",
    tenureCount: "100",
    installmentAmount: "",
    startDate: new Date().toISOString().slice(0, 10),
    purpose: "",
    notes: "",
  });
  const [emiManual, setEmiManual] = useState(false);

  function setC<K extends keyof typeof customer>(k: K, v: string) {
    setCustomer((f) => ({ ...f, [k]: v }));
  }
  function setL<K extends keyof typeof loan>(k: K, v: string) {
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
        if (j.data) {
          setCalc(j.data);
          if (!emiManual) {
            setLoan((prev) => ({ ...prev, installmentAmount: String(j.data.installmentAmount) }));
          }
        }
      })
      .catch(() => {});
  }, [debounced, emiManual]);

  const customerDocs: UploadedDoc[] = [
    photoUrl ? { type: "PHOTO", url: photoUrl } : undefined,
    aadhaarFront,
    aadhaarBack,
    panDoc,
    signatureDoc,
  ].filter(Boolean) as UploadedDoc[];

  const loanDocs: UploadedDoc[] = [incomeProof, bankStatement, otherLoanDoc].filter(
    Boolean
  ) as UploadedDoc[];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer.branchId) {
      toast.error("Select a branch");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            ...customer,
            photoUrl,
            documents: customerDocs,
          },
          loan: {
            ...loan,
            installmentAmount: loan.installmentAmount ? Number(loan.installmentAmount) : undefined,
            documents: loanDocs,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to submit");
        return;
      }
      toast.success(
        `Application ${json.data.applicationNo} submitted for review`
      );
      router.push(successRedirect);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section title="Personal">
              <Field label="Full Name *">
                <Input required value={customer.fullName} onChange={(e) => setC("fullName", e.target.value)} />
              </Field>
              <Field label="Father / Husband Name">
                <Input value={customer.fatherOrHusband} onChange={(e) => setC("fatherOrHusband", e.target.value)} />
              </Field>
              <Field label="Mobile *">
                <Input required value={customer.mobile} onChange={(e) => setC("mobile", e.target.value)} />
              </Field>
              <Field label="Alternate Mobile">
                <Input value={customer.altMobile} onChange={(e) => setC("altMobile", e.target.value)} />
              </Field>
              <Field label="Aadhaar">
                <Input value={customer.aadhaar} onChange={(e) => setC("aadhaar", e.target.value)} placeholder="12 digits" />
              </Field>
              <Field label="PAN / Tax ID">
                <Input value={customer.panOrTaxId} onChange={(e) => setC("panOrTaxId", e.target.value)} />
              </Field>
              <Field label="Date of Birth">
                <Input type="date" value={customer.dob} onChange={(e) => setC("dob", e.target.value)} />
              </Field>
              <Field label="Gender">
                <Select value={customer.gender} onChange={(e) => setC("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Marital Status">
                <Select value={customer.maritalStatus} onChange={(e) => setC("maritalStatus", e.target.value)}>
                  <option value="">Select</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="WIDOWED">Widowed</option>
                </Select>
              </Field>
              <Field label="Occupation">
                <Input value={customer.occupation} onChange={(e) => setC("occupation", e.target.value)} />
              </Field>
              <Field label="Monthly Income">
                <Input type="number" value={customer.monthlyIncome} onChange={(e) => setC("monthlyIncome", e.target.value)} />
              </Field>
              <Field label="Branch *">
                <Select required value={customer.branchId} onChange={(e) => setC("branchId", e.target.value)}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </Section>

            <Section title="Address">
              <Field wide label="Current Address *">
                <Textarea required value={customer.currentAddress} onChange={(e) => setC("currentAddress", e.target.value)} />
              </Field>
              <Field wide label="Permanent Address">
                <Textarea value={customer.permanentAddress} onChange={(e) => setC("permanentAddress", e.target.value)} />
              </Field>
            </Section>

            <Section title="Guarantor & Reference">
              <Field label="Guarantor Name">
                <Input value={customer.guarantorName} onChange={(e) => setC("guarantorName", e.target.value)} />
              </Field>
              <Field label="Guarantor Mobile">
                <Input value={customer.guarantorMobile} onChange={(e) => setC("guarantorMobile", e.target.value)} />
              </Field>
              <Field label="Relation">
                <Input value={customer.guarantorRelation} onChange={(e) => setC("guarantorRelation", e.target.value)} />
              </Field>
              <Field label="Reference Name">
                <Input value={customer.referenceName} onChange={(e) => setC("referenceName", e.target.value)} />
              </Field>
              <Field label="Reference Mobile">
                <Input value={customer.referenceMobile} onChange={(e) => setC("referenceMobile", e.target.value)} />
              </Field>
            </Section>

            <Section title="Bank & Nominee">
              <Field label="Bank Name">
                <Input value={customer.bankName} onChange={(e) => setC("bankName", e.target.value)} />
              </Field>
              <Field label="Account Number">
                <Input value={customer.bankAccount} onChange={(e) => setC("bankAccount", e.target.value)} />
              </Field>
              <Field label="IFSC">
                <Input value={customer.ifsc} onChange={(e) => setC("ifsc", e.target.value)} />
              </Field>
              <Field label="Nominee Name">
                <Input value={customer.nomineeName} onChange={(e) => setC("nomineeName", e.target.value)} />
              </Field>
              <Field label="Nominee Relation">
                <Input value={customer.nomineeRelation} onChange={(e) => setC("nomineeRelation", e.target.value)} />
              </Field>
            </Section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Interest Method *</Label>
              <Select value={loan.interestMethod} onChange={(e) => setL("interestMethod", e.target.value)}>
                <option value="SIMPLE">Simple Interest</option>
                <option value="COMPOUND">Compound Interest</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rate Period *</Label>
              <Select value={loan.ratePeriod} onChange={(e) => setL("ratePeriod", e.target.value)}>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annually</option>
              </Select>
            </div>
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
              <Select value={loan.loanType} onChange={(e) => setL("loanType", e.target.value)}>
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
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input required type="date" value={loan.startDate} onChange={(e) => setL("startDate", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Purpose</Label>
              <Input value={loan.purpose} onChange={(e) => setL("purpose", e.target.value)} placeholder="e.g. Business expansion" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={loan.notes} onChange={(e) => setL("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>KYC Documents</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DocumentSlot label="Aadhaar (Front)" type="AADHAAR_FRONT" value={aadhaarFront} onChange={setAadhaarFront} />
            <DocumentSlot label="Aadhaar (Back)" type="AADHAAR_BACK" value={aadhaarBack} onChange={setAadhaarBack} />
            <DocumentSlot label="PAN Card" type="PAN" value={panDoc} onChange={setPanDoc} />
            <DocumentSlot label="Signature" type="SIGNATURE" value={signatureDoc} onChange={setSignatureDoc} folder="signatures" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Supporting Documents</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DocumentSlot label="Income Proof" type="INCOME_PROOF" value={incomeProof} onChange={setIncomeProof} folder="loan-docs" />
            <DocumentSlot label="Bank Statement" type="BANK_STATEMENT" value={bankStatement} onChange={setBankStatement} folder="loan-docs" />
            <DocumentSlot label="Other" type="OTHER" value={otherLoanDoc} onChange={setOtherLoanDoc} folder="loan-docs" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Customer Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoCapture value={photoUrl} onChange={setPhotoUrl} folder="customers" label="Live Photo" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!calc ? (
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

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Submit for Review"}
          </Button>
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={"space-y-2 " + (wide ? "md:col-span-3" : "")}>
      <Label>{label}</Label>
      {children}
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
