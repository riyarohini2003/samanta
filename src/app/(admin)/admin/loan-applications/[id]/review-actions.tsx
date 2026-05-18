"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, Send } from "lucide-react";

type Employee = { id: string; name: string; employeeCode: string };

export function ReviewActions({
  appId,
  status,
  employees,
}: {
  appId: string;
  status: string;
  employees: Employee[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [remark, setRemark] = useState("");
  const [assignedId, setAssignedId] = useState(employees[0]?.id ?? "");
  const [mode, setMode] = useState<"CASH" | "BANK" | "UPI" | "CHEQUE">("CASH");
  const [firstDueDate, setFirstDueDate] = useState("");

  async function call(path: string, body: unknown, key: string, successMsg: string) {
    setLoading(key);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed");
        return;
      }
      toast.success(successMsg);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (status === "REJECTED") {
    return (
      <Card>
        <CardHeader><CardTitle>Application Rejected</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">This application was rejected and cannot be acted upon.</p></CardContent>
      </Card>
    );
  }

  if (status === "APPROVED") {
    return (
      <Card>
        <CardHeader><CardTitle>Ready for Disbursement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Assigned Field Employee *</Label>
              <Select value={assignedId} onChange={(e) => setAssignedId(e.target.value)}>
                {employees.length === 0 && <option value="">No employees in this branch</option>}
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.employeeCode} · {e.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disbursement Mode *</Label>
              <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>First Collection Date</Label>
              <Input
                type="date"
                value={firstDueDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to start the repayment schedule from the disbursement date.
              </p>
            </div>
          </div>
          <Button
            disabled={loading !== null || !assignedId}
            onClick={() =>
              call(
                `/api/v1/loan-applications/${appId}/disburse`,
                {
                  assignedEmployeeId: assignedId,
                  disbursementMode: mode,
                  ...(firstDueDate ? { firstDueDate } : {}),
                },
                "disburse",
                "Loan disbursed. Repayment schedule generated."
              )
            }
          >
            {loading === "disburse" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Disburse Loan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Review Actions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Remark / Reason (required for rejection)</Label>
          <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a note…" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="success"
            disabled={loading !== null}
            onClick={() =>
              call(`/api/v1/loan-applications/${appId}/approve`, { remark }, "approve", "Application approved")
            }
          >
            {loading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Approve
          </Button>
          <Button
            variant="destructive"
            disabled={loading !== null || remark.trim().length < 2}
            onClick={() =>
              call(`/api/v1/loan-applications/${appId}/reject`, { remark }, "reject", "Application rejected")
            }
          >
            {loading === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
