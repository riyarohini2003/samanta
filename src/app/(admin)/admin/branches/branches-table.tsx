"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { useRowSelection } from "@/lib/use-row-selection";
import { runBulkDelete } from "@/lib/bulk-delete";

export interface BranchRow {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  contactNumber: string;
  isActive: boolean;
  createdAt: Date | string;
  _count: { users: number; customers: number; loans: number };
}

export default function BranchesTable({ branches }: { branches: BranchRow[] }) {
  const router = useRouter();
  const ids = useMemo(() => branches.map((b) => b.id), [branches]);
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
      await runBulkDelete("/api/v1/branches", pendingIds);
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
            <span>{branches.length} branch{branches.length === 1 ? "" : "es"}</span>
          )}
        </div>
        <div className="flex gap-2">
          {sel.count > 0 && (
            <Button variant="destructive" onClick={() => askDelete(sel.ids)}>
              <Trash2 className="h-4 w-4" /> Delete selected ({sel.count})
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/branches/new">
              <Plus className="h-4 w-4" /> New Branch
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
                aria-label="Select all branches"
              />
            </TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Customers</TableHead>
            <TableHead>Loans</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map((b) => (
            <TableRow key={b.id} data-selected={sel.selected.has(b.id) || undefined}>
              <TableCell>
                <Checkbox
                  checked={sel.selected.has(b.id)}
                  onCheckedChange={() => sel.toggle(b.id)}
                  aria-label={`Select ${b.name}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{b.code}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/admin/branches/${b.id}`} className="hover:underline">
                  {b.name}
                </Link>
              </TableCell>
              <TableCell>
                {b.city}, {b.state}
              </TableCell>
              <TableCell>{b.contactNumber}</TableCell>
              <TableCell>{b._count.users}</TableCell>
              <TableCell>{b._count.customers}</TableCell>
              <TableCell>{b._count.loans}</TableCell>
              <TableCell>
                <StatusBadge status={b.isActive ? "ACTIVE" : "CLOSED"} />
              </TableCell>
              <TableCell>{fmtDate(b.createdAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Edit">
                    <Link href={`/admin/branches/${b.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    onClick={() => askDelete([b.id])}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {branches.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                No branches yet.{" "}
                <Link href="/admin/branches/new" className="text-primary hover:underline">
                  Create your first branch
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
        title={pendingIds.length === 1 ? "Delete this branch?" : `Delete ${pendingIds.length} branches?`}
        description={
          <>
            This is a soft delete — the branch will be hidden from lists but its data is preserved.
            Branches with active employees, customers, or loans will be blocked automatically.
          </>
        }
        confirmLabel="Delete"
        onConfirm={doDelete}
      />
    </>
  );
}
