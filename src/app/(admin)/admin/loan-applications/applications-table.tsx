"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { useRowSelection } from "@/lib/use-row-selection";
import { runBulkDelete } from "@/lib/bulk-delete";

const EDITABLE_STATUSES = new Set(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_BACK"]);
const DELETABLE_STATUSES = new Set(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REJECTED", "SENT_BACK"]);

export interface ApplicationRow {
  id: string;
  applicationNo: string;
  loanType: string;
  principal: number;
  tenureCount: number;
  status: string;
  createdAt: Date | string;
  customer: { customerCode: string; fullName: string; mobile: string };
  branch: { code: string; name: string };
  createdBy: { name: string };
}

export default function ApplicationsTable({ apps }: { apps: ApplicationRow[] }) {
  const router = useRouter();
  const deletableIds = useMemo(
    () => apps.filter((a) => DELETABLE_STATUSES.has(a.status)).map((a) => a.id),
    [apps]
  );
  const sel = useRowSelection(deletableIds);
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
      await runBulkDelete("/api/v1/loan-applications", pendingIds);
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
            <span>{apps.length} application{apps.length === 1 ? "" : "s"}</span>
          )}
        </div>
        <div className="flex gap-2">
          {sel.count > 0 && (
            <Button variant="destructive" onClick={() => askDelete(sel.ids)}>
              <Trash2 className="h-4 w-4" /> Delete selected ({sel.count})
            </Button>
          )}
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
                aria-label="Select all deletable applications"
              />
            </TableHead>
            <TableHead>App No</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Tenure</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Submitted By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((a) => {
            const canEdit = EDITABLE_STATUSES.has(a.status);
            const canDelete = DELETABLE_STATUSES.has(a.status);
            return (
              <TableRow key={a.id}>
                <TableCell>
                  {canDelete ? (
                    <Checkbox
                      checked={sel.selected.has(a.id)}
                      onCheckedChange={() => sel.toggle(a.id)}
                      aria-label={`Select ${a.applicationNo}`}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <Link href={`/admin/loan-applications/${a.id}`} className="hover:underline">
                    {a.applicationNo}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {a.customer.fullName}
                  <div className="text-xs text-muted-foreground">{a.customer.mobile}</div>
                </TableCell>
                <TableCell>{a.loanType}</TableCell>
                <TableCell>{formatMoney(a.principal)}</TableCell>
                <TableCell>{a.tenureCount}</TableCell>
                <TableCell>{a.branch.name}</TableCell>
                <TableCell>{a.createdBy.name}</TableCell>
                <TableCell>{fmtDate(a.createdAt)}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {canEdit && (
                      <Button asChild variant="ghost" size="icon" title="Edit">
                        <Link href={`/admin/loan-applications/${a.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => askDelete([a.id])}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {apps.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                No applications found.
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
        title={pendingIds.length === 1 ? "Delete this application?" : `Delete ${pendingIds.length} applications?`}
        description="Hard delete — only pre-disbursement applications can be removed. Applications with an active loan account will be blocked."
        confirmLabel="Delete"
        onConfirm={doDelete}
      />
    </>
  );
}
