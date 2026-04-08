"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/formatters";

interface LoanCloseDialogProps {
  loanId: string;
  pendingAmount: number;
  loanStatus: string;
}

export function LoanCloseButton({ loanId, pendingAmount, loanStatus }: LoanCloseDialogProps) {
  const [openClose, setOpenClose] = useState(false);
  const [openPreClose, setOpenPreClose] = useState(false);

  const isClosed = loanStatus === "CLOSED" || loanStatus === "WRITTEN_OFF";
  if (isClosed) return null;

  const canNormalClose = pendingAmount <= 0.01;

  return (
    <>
      {canNormalClose && (
        <Button variant="success" onClick={() => setOpenClose(true)}>
          Close Loan
        </Button>
      )}
      <Button variant="outline" onClick={() => setOpenPreClose(true)}>
        Pre-Close / Foreclose
      </Button>

      <NormalCloseDialog
        open={openClose}
        loanId={loanId}
        onClose={() => setOpenClose(false)}
      />
      <PreCloseDialog
        open={openPreClose}
        loanId={loanId}
        pendingAmount={pendingAmount}
        onClose={() => setOpenPreClose(false)}
      />
    </>
  );
}

function NormalCloseDialog({
  open,
  loanId,
  onClose,
}: {
  open: boolean;
  loanId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClose() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/loans/${loanId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "close" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to close loan");
        return;
      }
      toast.success("Loan closed successfully");
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Loan</DialogTitle>
          <DialogDescription>
            All installments have been paid. This will mark the loan as closed.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          All dues have been cleared. The loan account will be permanently closed.
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleClose} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreCloseDialog({
  open,
  loanId,
  pendingAmount,
  onClose,
}: {
  open: boolean;
  loanId: string;
  pendingAmount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [waiverAmount, setWaiverAmount] = useState("");

  const waiver = Number(waiverAmount) || 0;
  const remaining = Math.max(pendingAmount - waiver, 0);
  const canSubmit = remaining <= 0.01;

  async function handlePreClose() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/loans/${loanId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "preclose", waiverAmount: waiver }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to pre-close loan");
        return;
      }
      toast.success("Loan pre-closed successfully");
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pre-Close / Foreclose Loan</DialogTitle>
          <DialogDescription>
            Close this loan early by waiving the remaining balance.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Outstanding Balance</span>
            <span className="font-semibold">{formatMoney(pendingAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Waiver Amount</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              - {formatMoney(waiver)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Remaining After Waiver</span>
            <span className={`font-bold ${canSubmit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {formatMoney(remaining)}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Waiver Amount</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Enter amount to waive"
            value={waiverAmount}
            onChange={(e) => setWaiverAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Waiver must cover the full outstanding balance to close the loan.
          </p>
        </div>

        {!canSubmit && waiver > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Remaining balance of {formatMoney(remaining)} must be collected or waived to close.
          </div>
        )}

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePreClose} disabled={loading || !canSubmit}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Pre-Close with ${formatMoney(waiver)} Waiver`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
