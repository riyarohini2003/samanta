"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type Branch = { id: string; code: string; name: string };

export interface CustomerFormInitial {
  id?: string;
  fullName?: string;
  fatherOrHusband?: string | null;
  mobile?: string;
  altMobile?: string | null;
  aadhaar?: string | null;
  panOrTaxId?: string | null;
  dob?: Date | string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  occupation?: string | null;
  monthlyIncome?: number | null;
  currentAddress?: string;
  permanentAddress?: string | null;
  guarantorName?: string | null;
  guarantorMobile?: string | null;
  guarantorRelation?: string | null;
  referenceName?: string | null;
  referenceMobile?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  nomineeName?: string | null;
  nomineeRelation?: string | null;
  branchId?: string;
}

export function CustomerForm({
  branches,
  defaultBranchId,
  returnTo,
  initial,
}: {
  branches: Branch[];
  defaultBranchId?: string;
  returnTo: string;
  initial?: CustomerFormInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const toStr = (v: unknown) => (v == null ? "" : String(v));
  const toDateStr = (v: Date | string | null | undefined) => {
    if (!v) return "";
    const d = typeof v === "string" ? new Date(v) : v;
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };
  const [form, setForm] = useState({
    fullName: toStr(initial?.fullName),
    fatherOrHusband: toStr(initial?.fatherOrHusband),
    mobile: toStr(initial?.mobile),
    altMobile: toStr(initial?.altMobile),
    aadhaar: toStr(initial?.aadhaar),
    panOrTaxId: toStr(initial?.panOrTaxId),
    dob: toDateStr(initial?.dob),
    gender: toStr(initial?.gender),
    maritalStatus: toStr(initial?.maritalStatus),
    occupation: toStr(initial?.occupation),
    monthlyIncome: toStr(initial?.monthlyIncome),
    currentAddress: toStr(initial?.currentAddress),
    permanentAddress: toStr(initial?.permanentAddress),
    guarantorName: toStr(initial?.guarantorName),
    guarantorMobile: toStr(initial?.guarantorMobile),
    guarantorRelation: toStr(initial?.guarantorRelation),
    referenceName: toStr(initial?.referenceName),
    referenceMobile: toStr(initial?.referenceMobile),
    bankName: toStr(initial?.bankName),
    bankAccount: toStr(initial?.bankAccount),
    ifsc: toStr(initial?.ifsc),
    nomineeName: toStr(initial?.nomineeName),
    nomineeRelation: toStr(initial?.nomineeRelation),
    branchId: initial?.branchId ?? defaultBranchId ?? branches[0]?.id ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/customers/${initial!.id}` : "/api/v1/customers";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, monthlyIncome: form.monthlyIncome || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success(`Customer ${isEdit ? "updated" : "created"}`);
      router.push(returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <form onSubmit={onSubmit} className="space-y-8">
          <Section title="Personal Details">
            <Field label="Full Name *"><Input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Father / Husband Name"><Input value={form.fatherOrHusband} onChange={(e) => set("fatherOrHusband", e.target.value)} /></Field>
            <Field label="Mobile *"><Input required value={form.mobile} onChange={(e) => set("mobile", e.target.value)} /></Field>
            <Field label="Alternate Mobile"><Input value={form.altMobile} onChange={(e) => set("altMobile", e.target.value)} /></Field>
            <Field label="Aadhaar Number"><Input value={form.aadhaar} onChange={(e) => set("aadhaar", e.target.value)} placeholder="12 digits" /></Field>
            <Field label="PAN / Tax ID"><Input value={form.panOrTaxId} onChange={(e) => set("panOrTaxId", e.target.value)} /></Field>
            <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Marital Status">
              <Select value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                <option value="">Select</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="WIDOWED">Widowed</option>
              </Select>
            </Field>
            <Field label="Occupation"><Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
            <Field label="Monthly Income"><Input type="number" value={form.monthlyIncome} onChange={(e) => set("monthlyIncome", e.target.value)} /></Field>
            <Field label="Branch *">
              <Select required value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
              </Select>
            </Field>
          </Section>

          <Section title="Address">
            <Field label="Current Address *" wide><Textarea required value={form.currentAddress} onChange={(e) => set("currentAddress", e.target.value)} /></Field>
            <Field label="Permanent Address" wide><Textarea value={form.permanentAddress} onChange={(e) => set("permanentAddress", e.target.value)} /></Field>
          </Section>

          <Section title="Guarantor & Reference">
            <Field label="Guarantor Name"><Input value={form.guarantorName} onChange={(e) => set("guarantorName", e.target.value)} /></Field>
            <Field label="Guarantor Mobile"><Input value={form.guarantorMobile} onChange={(e) => set("guarantorMobile", e.target.value)} /></Field>
            <Field label="Relation"><Input value={form.guarantorRelation} onChange={(e) => set("guarantorRelation", e.target.value)} /></Field>
            <Field label="Reference Name"><Input value={form.referenceName} onChange={(e) => set("referenceName", e.target.value)} /></Field>
            <Field label="Reference Mobile"><Input value={form.referenceMobile} onChange={(e) => set("referenceMobile", e.target.value)} /></Field>
          </Section>

          <Section title="Bank & Nominee">
            <Field label="Bank Name"><Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
            <Field label="Account Number"><Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} /></Field>
            <Field label="IFSC"><Input value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} /></Field>
            <Field label="Nominee Name"><Input value={form.nomineeName} onChange={(e) => set("nomineeName", e.target.value)} /></Field>
            <Field label="Nominee Relation"><Input value={form.nomineeRelation} onChange={(e) => set("nomineeRelation", e.target.value)} /></Field>
          </Section>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Customer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
