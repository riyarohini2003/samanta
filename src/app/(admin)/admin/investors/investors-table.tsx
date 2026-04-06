"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Trash2, Plus, Eye } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { useRowSelection } from "@/lib/use-row-selection";
import { runBulkDelete } from "@/lib/bulk-delete";

export interface InvestorRow {
  id: string;
  investorCode: string;
  fullName: string;
  mobile: string;
  email: string | null;
  isActive: boolean;
  createdAt: Date | string;
  _count: { investments: number };
  totalPrincipal: number;
  totalInterest: number;
  totalReturn: number;
  totalPaid: number;
}

export default function InvestorsTable({ investors }: { investors: InvestorRow[] }) {
  const router = useRouter();
  const ids = useMemo(() => investors.map((i) => i.id), [investors]);
  const sel = useRowSelection(ids);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function askDelete(targetIds: string[]) {
    if (targetIds.length === 0) return;
    setPendingIds(targetIds);
    setConfirmOpen(true);
  }

  async function doDelete() {
    setLoading(true);
    try {
      await runBulkDelete("/api/v1/investors", pendingIds);
      setConfirmOpen(false);
      sel.clear();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {sel.count > 0 ? (
            <span>{sel.count} selected</span>
          ) : (
            <span>{investors.length} investor{investors.length === 1 ? "" : "s"}</span>
          )}
        </div>
        <div className="flex gap-2">
          {sel.count > 0 && (
            <Button variant="destructive" onClick={() => askDelete(sel.ids)}>
              <Trash2 className="h-4 w-4" /> Delete selected ({sel.count})
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/investors/new">
              <Plus className="h-4 w-4" /> New Investor
            </Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={sel.isAllSelected}
                indeterminate={sel.isSomeSelected}
                onCheckedChange={sel.toggleAll}
                aria-label="Select all investors"
              />
            </TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Investments</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>ROI Payable</TableHead>
            <TableHead>Total Return</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investors.map((inv) => (
            <TableRow key={inv.id} data-selected={sel.selected.has(inv.id) || undefined}>
              <TableCell>
                <Checkbox
                  checked={sel.selected.has(inv.id)}
                  onCheckedChange={() => sel.toggle(inv.id)}
                  aria-label={`Select ${inv.fullName}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{inv.investorCode}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/admin/investors/${inv.id}`} className="hover:underline">
                  {inv.fullName}
                </Link>
              </TableCell>
              <TableCell>{inv.mobile}</TableCell>
              <TableCell>{inv._count.investments}</TableCell>
              <TableCell>{formatMoney(inv.totalPrincipal)}</TableCell>
              <TableCell className="text-amber-600 dark:text-amber-400">{formatMoney(inv.totalInterest)}</TableCell>
              <TableCell className="font-semibold">{formatMoney(inv.totalReturn)}</TableCell>
              <TableCell className="text-green-600 dark:text-green-400">{formatMoney(inv.totalPaid)}</TableCell>
              <TableCell>
                <StatusBadge status={inv.isActive ? "ACTIVE" : "CLOSED"} />
              </TableCell>
              <TableCell>{fmtDate(inv.createdAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="View">
                    <Link href={`/admin/investors/${inv.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    onClick={() => askDelete([inv.id])}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {investors.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                No investors yet.{" "}
                <Link href="/admin/investors/new" className="text-primary hover:underline">
                  Add your first investor
                </Link>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        loading={loading}
        title={pendingIds.length === 1 ? "Delete this investor?" : `Delete ${pendingIds.length} investors?`}
        description="This is a soft delete — the investor will be hidden from lists but data is preserved. Investors with active investments will be blocked."
        confirmLabel="Delete"
        onConfirm={doDelete}
      />
    </>
  );
}
