"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

type Mode = "CASH" | "UPI" | "BANK" | "CHEQUE";

export default function PayoutRowActions({
  investmentId,
  payoutId,
  status,
  remaining,
}: {
  investmentId: string;
  payoutId: string;
  status: string;
  remaining: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(remaining.toFixed(2));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<Mode>("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  async function recordPayment() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/investments/${investmentId}/payouts/${payoutId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paidAmount: Number(paidAmount),
            paidAt,
            paymentMode: mode,
            reference: reference || null,
            note: note || null,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to record payment");
        return;
      }
      toast.success("Payment recorded");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(newStatus: "SKIPPED" | "PENDING") {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/investments/${investmentId}/payouts/${payoutId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update");
        return;
      }
      toast.success(`Marked as ${newStatus.toLowerCase()}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1">
      {status !== "PAID" && (
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button size="sm" variant="outline">
              Pay
            </Button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg">
              <DialogPrimitive.Title className="text-lg font-semibold">
                Record Payout Payment
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                Remaining due: ₹{remaining.toFixed(2)}
              </DialogPrimitive.Description>
              <div className="grid gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Paid On</Label>
                  <Input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Mode</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <Label>Reference / Txn ID</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Note</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={recordPayment} disabled={loading || Number(paidAmount) <= 0}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
      {status !== "PAID" && status !== "SKIPPED" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => setStatus("SKIPPED")}
        >
          Skip
        </Button>
      )}
      {status === "SKIPPED" && (
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => setStatus("PENDING")}
        >
          Reopen
        </Button>
      )}
    </div>
  );
}
