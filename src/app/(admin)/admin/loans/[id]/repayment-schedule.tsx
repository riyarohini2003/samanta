"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import dayjs, { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { randomId } from "@/lib/utils";

interface ScheduleRow {
  id: string;
  installmentNo: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  status: string;
  paidAt: string | null;
}

interface Props {
  loanAccountId: string;
  loanStatus: string;
  schedule: ScheduleRow[];
}

export default function RepaymentSchedule({ loanAccountId, loanStatus, schedule }: Props) {
  const router = useRouter();
  const [activeRow, setActiveRow] = useState<ScheduleRow | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const isClosed = loanStatus === "CLOSED" || loanStatus === "WRITTEN_OFF";

  function openCollect(row: ScheduleRow) {
    setActiveRow(row);
    setPayOpen(true);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid At</TableHead>
            {!isClosed && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map((s) => {
            const canCollect = s.status !== "PAID" && s.status !== "SKIPPED" && !isClosed;
            return (
              <TableRow key={s.id}>
                <TableCell>{s.installmentNo}</TableCell>
                <TableCell>
                  <div>{fmtDate(s.dueDate)}</div>
                  <div className="text-[11px] text-muted-foreground">{dayjs(s.dueDate).format("dddd")}</div>
                </TableCell>
                <TableCell>{formatMoney(s.dueAmount)}</TableCell>
                <TableCell>{formatMoney(s.paidAmount)}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>{s.paidAt ? fmtDateTime(s.paidAt) : "—"}</TableCell>
                {!isClosed && (
                  <TableCell className="text-right">
                    {canCollect && (
                      <Button size="sm" variant="outline" onClick={() => openCollect(s)}>
                        Collect
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <CollectDialog
        open={payOpen}
        row={activeRow}
        loanAccountId={loanAccountId}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setPayOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function CollectDialog({
  open,
  row,
  loanAccountId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  row: ScheduleRow | null;
  loanAccountId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ amount: "", mode: "CASH" as "CASH" | "UPI" | "BANK" | "CHEQUE", penalty: "0", note: "" });

  useEffect(() => {
    if (row) {
      const pending = Math.max(Number(row.dueAmount) - Number(row.paidAmount), 0);
      setForm({ amount: String(pending), mode: "CASH", penalty: "0", note: "" });
    }
  }, [row]);

  if (!row) return null;

  const pending = Math.max(Number(row.dueAmount) - Number(row.paidAmount), 0);
  const isAdvance = new Date(row.dueDate) > new Date();

  async function submit() {
    setLoading(true);
    try {
      const clientRef = randomId();
      const res = await fetch("/api/v1/collections/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanAccountId,
          scheduleId: row!.id,
          amount: Number(form.amount),
          penalty: Number(form.penalty || 0),
          mode: form.mode,
          note: form.note || undefined,
          clientRef,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Payment failed"); return; }
      toast.success(`Payment collected · ${json.data.receiptNo}`);
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isAdvance ? "Collect Advance EMI" : "Collect Payment"}
          </DialogTitle>
          <DialogDescription>
            Installment #{row.installmentNo} · Due {fmtDate(row.dueDate)}
            {isAdvance && " (Advance)"}
          </DialogDescription>
        </DialogHeader>

        {isAdvance && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            This is an advance payment — the due date is in the future.
          </div>
        )}

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Installment Due</span>
            <span className="font-semibold">{formatMoney(row.dueAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Already Paid</span>
            <span>{formatMoney(row.paidAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 mt-2">
            <span className="font-medium">Pending</span>
            <span className="font-bold">{formatMoney(pending)}</span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mode *</Label>
              <Select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as any }))}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank</option>
                <option value="CHEQUE">Cheque</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Penalty</Label>
              <Input
                type="number"
                step="0.01"
                value={form.penalty}
                onChange={(e) => setForm((f) => ({ ...f, penalty: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Optional note…"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !form.amount || Number(form.amount) <= 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Collect & Generate Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
