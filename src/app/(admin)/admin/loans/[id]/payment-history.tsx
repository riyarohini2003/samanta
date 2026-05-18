"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import dayjs, { fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

interface PaymentRow {
  id: string;
  receiptNo: string;
  collectedAt: string;
  amount: number;
  penalty: number;
  mode: "CASH" | "UPI" | "BANK" | "CHEQUE";
  collectedByName: string;
  note: string | null;
}

interface Props {
  canEdit: boolean;
  payments: PaymentRow[];
}

export default function PaymentHistory({ canEdit, payments }: Props) {
  const [editRow, setEditRow] = useState<PaymentRow | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Collected By</TableHead>
            <TableHead>Note</TableHead>
            {canEdit && <TableHead className="text-right">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
              <TableCell>{fmtDateTime(p.collectedAt)}</TableCell>
              <TableCell>{formatMoney(p.amount)}</TableCell>
              <TableCell>{p.mode}</TableCell>
              <TableCell>{p.collectedByName}</TableCell>
              <TableCell>{p.note ?? "—"}</TableCell>
              {canEdit && (
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditRow(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 7 : 6} className="py-8 text-center text-muted-foreground">
                No payments yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <EditDialog row={editRow} onClose={() => setEditRow(null)} />
    </>
  );
}

function EditDialog({ row, onClose }: { row: PaymentRow | null; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    penalty: "0",
    mode: "CASH" as PaymentRow["mode"],
    note: "",
    collectedAt: "",
  });

  useEffect(() => {
    if (row) {
      setForm({
        amount: String(row.amount),
        penalty: String(row.penalty),
        mode: row.mode,
        note: row.note ?? "",
        collectedAt: dayjs(row.collectedAt).format("YYYY-MM-DDTHH:mm"),
      });
    }
  }, [row]);

  if (!row) return null;

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/payments/${row!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          penalty: Number(form.penalty || 0),
          mode: form.mode,
          note: form.note || null,
          collectedAt: form.collectedAt ? new Date(form.collectedAt).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Update failed");
        return;
      }
      toast.success("Payment updated");
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Receipt {row.receiptNo} · Editing will recompute loan schedule and balances.
          </DialogDescription>
        </DialogHeader>

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
              <Select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as PaymentRow["mode"] }))}
              >
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
            <Label>Collected At</Label>
            <Input
              type="datetime-local"
              value={form.collectedAt}
              onChange={(e) => setForm((f) => ({ ...f, collectedAt: e.target.value }))}
            />
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
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || !form.amount || Number(form.amount) <= 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
