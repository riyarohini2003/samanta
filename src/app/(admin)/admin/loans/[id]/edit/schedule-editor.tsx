"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

const toDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const toDateTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekdayOf = (value: string) => {
  if (!value) return "";
  const iso = value.length === 10 ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
};

export type InstallmentStatus = "PENDING" | "PAID" | "PARTIAL" | "MISSED" | "SKIPPED";

export interface ScheduleRowValues {
  id: string;
  installmentNo: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  paidAt: string | null;
  status: InstallmentStatus;
  penaltyAmount: number;
}

interface RowState {
  installmentNo: string;
  dueDate: string;
  dueAmount: string;
  paidAmount: string;
  paidAt: string;
  status: InstallmentStatus;
  penaltyAmount: string;
}

function toRowState(s: ScheduleRowValues): RowState {
  return {
    installmentNo: String(s.installmentNo),
    dueDate: toDate(s.dueDate),
    dueAmount: String(s.dueAmount),
    paidAmount: String(s.paidAmount),
    paidAt: toDateTime(s.paidAt),
    status: s.status,
    penaltyAmount: String(s.penaltyAmount),
  };
}

export default function ScheduleEditor({
  loanAccountId,
  initial,
  syncedDueDates,
}: {
  loanAccountId: string;
  initial: ScheduleRowValues[];
  syncedDueDates?: Record<string, string>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(initial.map((s) => [s.id, toRowState(s)])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  function set(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  useEffect(() => {
    if (!syncedDueDates) return;
    setRows((prev) => {
      let changed = false;
      const next: Record<string, RowState> = { ...prev };
      for (const [id, date] of Object.entries(syncedDueDates)) {
        if (next[id] && next[id].dueDate !== date) {
          next[id] = { ...next[id], dueDate: date };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [syncedDueDates]);

  async function save(id: string) {
    const r = rows[id];
    if (!r) return;
    setSavingId(id);
    try {
      const payload = {
        installmentNo: Number(r.installmentNo),
        dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
        dueAmount: Number(r.dueAmount),
        paidAmount: Number(r.paidAmount),
        paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
        status: r.status,
        penaltyAmount: Number(r.penaltyAmount),
      };
      const res = await fetch(`/api/v1/loans/${loanAccountId}/schedule/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update installment");
        return;
      }
      toast.success(`Installment #${r.installmentNo} updated`);
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  const [savingAll, setSavingAll] = useState(false);

  async function saveAll() {
    setSavingAll(true);
    try {
      const entries = Object.entries(rows);
      const results = await Promise.allSettled(
        entries.map(async ([id, r]) => {
          const payload = {
            installmentNo: Number(r.installmentNo),
            dueDate: r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
            dueAmount: Number(r.dueAmount),
            paidAmount: Number(r.paidAmount),
            paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
            status: r.status,
            penaltyAmount: Number(r.penaltyAmount),
          };
          const res = await fetch(`/api/v1/loans/${loanAccountId}/schedule/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json?.error || `Installment #${r.installmentNo} failed`);
          }
        }),
      );
      const failed = results.filter((x) => x.status === "rejected") as PromiseRejectedResult[];
      const okCount = results.length - failed.length;
      if (failed.length === 0) {
        toast.success(`Saved ${okCount} installments`);
      } else {
        toast.error(`${okCount} saved, ${failed.length} failed: ${failed[0].reason?.message ?? "unknown"}`);
      }
      router.refresh();
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Schedule (EMIs) — raw override</CardTitle>
        <Button onClick={saveAll} disabled={savingAll || initial.length === 0} size="sm">
          {savingAll ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Save All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">#</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Due Amount</TableHead>
              <TableHead>Paid Amount</TableHead>
              <TableHead>Paid At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Penalty</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((s) => {
              const r = rows[s.id];
              if (!r) return null;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={r.installmentNo}
                      onChange={(e) => set(s.id, { installmentNo: e.target.value })}
                      className="h-8 w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={r.dueDate}
                      onChange={(e) => set(s.id, { dueDate: e.target.value })}
                      className="h-8"
                    />
                    {weekdayOf(r.dueDate) && (
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {weekdayOf(r.dueDate)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.dueAmount}
                      onChange={(e) => set(s.id, { dueAmount: e.target.value })}
                      className="h-8 w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.paidAmount}
                      onChange={(e) => set(s.id, { paidAmount: e.target.value })}
                      className="h-8 w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="datetime-local"
                      value={r.paidAt}
                      onChange={(e) => set(s.id, { paidAt: e.target.value })}
                      className="h-8"
                    />
                    {weekdayOf(r.paidAt) && (
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {weekdayOf(r.paidAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onChange={(e) => set(s.id, { status: e.target.value as InstallmentStatus })}
                      className="h-8"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="MISSED">Missed</option>
                      <option value="SKIPPED">Skipped</option>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={r.penaltyAmount}
                      onChange={(e) => set(s.id, { penaltyAmount: e.target.value })}
                      className="h-8 w-24"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => save(s.id)}
                      disabled={savingId === s.id}
                    >
                      {savingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {initial.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No installments on this loan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
