"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

const toDateInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const toDateTimeInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export interface LoanEditValues {
  id: string;
  accountNo: string;
  loanType: "DAILY" | "WEEKLY" | "MONTHLY";
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  penaltyAmount: number;
  disbursedAt: string;
  disbursementMode: "CASH" | "BANK" | "UPI" | "CHEQUE";
  startDate: string;
  maturityDate: string;
  nextDueDate: string | null;
  status: "ACTIVE" | "CLOSED" | "OVERDUE" | "NPA" | "WRITTEN_OFF";
  closedAt: string | null;
  branchId: string;
  assignedEmployeeId: string;
}

export default function LoanEditForm({
  loan,
  branches,
  employees,
}: {
  loan: LoanEditValues;
  branches: { id: string; code: string; name: string }[];
  employees: { id: string; name: string; employeeCode: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    accountNo: loan.accountNo,
    loanType: loan.loanType,
    principal: String(loan.principal),
    interestAmount: String(loan.interestAmount),
    totalPayable: String(loan.totalPayable),
    installmentAmount: String(loan.installmentAmount),
    paidAmount: String(loan.paidAmount),
    pendingAmount: String(loan.pendingAmount),
    overdueAmount: String(loan.overdueAmount),
    penaltyAmount: String(loan.penaltyAmount),
    disbursedAt: toDateTimeInput(loan.disbursedAt),
    disbursementMode: loan.disbursementMode,
    startDate: toDateInput(loan.startDate),
    maturityDate: toDateInput(loan.maturityDate),
    nextDueDate: toDateInput(loan.nextDueDate),
    status: loan.status,
    closedAt: toDateTimeInput(loan.closedAt),
    branchId: loan.branchId,
    assignedEmployeeId: loan.assignedEmployeeId,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        accountNo: form.accountNo,
        loanType: form.loanType,
        principal: Number(form.principal),
        interestAmount: Number(form.interestAmount),
        totalPayable: Number(form.totalPayable),
        installmentAmount: Number(form.installmentAmount),
        paidAmount: Number(form.paidAmount),
        pendingAmount: Number(form.pendingAmount),
        overdueAmount: Number(form.overdueAmount),
        penaltyAmount: Number(form.penaltyAmount),
        disbursedAt: form.disbursedAt ? new Date(form.disbursedAt).toISOString() : undefined,
        disbursementMode: form.disbursementMode,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        maturityDate: form.maturityDate ? new Date(form.maturityDate).toISOString() : undefined,
        nextDueDate: form.nextDueDate ? new Date(form.nextDueDate).toISOString() : null,
        status: form.status,
        closedAt: form.closedAt ? new Date(form.closedAt).toISOString() : null,
        branchId: form.branchId,
        assignedEmployeeId: form.assignedEmployeeId,
      };

      const res = await fetch(`/api/v1/loans/${loan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update loan");
        return;
      }
      toast.success("Loan account updated");
      router.push(`/admin/loans/${loan.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Identifiers & Type</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Account No</Label>
            <Input value={form.accountNo} onChange={(e) => set("accountNo", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Loan Type</Label>
            <Select value={form.loanType} onChange={(e) => set("loanType", e.target.value as LoanEditValues["loanType"])}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => set("status", e.target.value as LoanEditValues["status"])}>
              <option value="ACTIVE">Active</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CLOSED">Closed</option>
              <option value="NPA">NPA</option>
              <option value="WRITTEN_OFF">Written Off</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Disbursement Mode</Label>
            <Select value={form.disbursementMode} onChange={(e) => set("disbursementMode", e.target.value as LoanEditValues["disbursementMode"])}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Financials (raw override)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Principal</Label>
            <Input type="number" step="0.01" value={form.principal} onChange={(e) => set("principal", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Interest Amount</Label>
            <Input type="number" step="0.01" value={form.interestAmount} onChange={(e) => set("interestAmount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Total Payable</Label>
            <Input type="number" step="0.01" value={form.totalPayable} onChange={(e) => set("totalPayable", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Installment Amount</Label>
            <Input type="number" step="0.01" value={form.installmentAmount} onChange={(e) => set("installmentAmount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Paid Amount</Label>
            <Input type="number" step="0.01" value={form.paidAmount} onChange={(e) => set("paidAmount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Pending Amount</Label>
            <Input type="number" step="0.01" value={form.pendingAmount} onChange={(e) => set("pendingAmount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Overdue Amount</Label>
            <Input type="number" step="0.01" value={form.overdueAmount} onChange={(e) => set("overdueAmount", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Penalty Amount</Label>
            <Input type="number" step="0.01" value={form.penaltyAmount} onChange={(e) => set("penaltyAmount", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dates</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Disbursed At</Label>
            <Input type="datetime-local" value={form.disbursedAt} onChange={(e) => set("disbursedAt", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Maturity Date</Label>
            <Input type="date" value={form.maturityDate} onChange={(e) => set("maturityDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Next Due Date</Label>
            <Input type="date" value={form.nextDueDate} onChange={(e) => set("nextDueDate", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Closed At</Label>
            <Input type="datetime-local" value={form.closedAt} onChange={(e) => set("closedAt", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Branch</Label>
            <Select value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Assigned Officer</Label>
            <Select value={form.assignedEmployeeId} onChange={(e) => set("assignedEmployeeId", e.target.value)}>
              {employees.map((u) => (
                <option key={u.id} value={u.id}>{u.employeeCode} — {u.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
