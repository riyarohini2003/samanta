"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { useRowSelection } from "@/lib/use-row-selection";
import { runBulkDelete } from "@/lib/bulk-delete";

export interface CustomerRow {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  createdAt: Date | string;
  branch: { code: string; name: string };
  _count: { loans: number };
}

export default function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.branch.name.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const ids = useMemo(() => filtered.map((c) => c.id), [filtered]);
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
      await runBulkDelete("/api/v1/customers", pendingIds);
      setConfirmOpen(false);
      sel.clear();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {sel.count > 0 ? `${sel.count} selected` : `${filtered.length} customer${filtered.length === 1 ? "" : "s"}`}
          </span>
          {sel.count > 0 && (
            <Button variant="destructive" onClick={() => askDelete(sel.ids)}>
              <Trash2 className="h-4 w-4" /> Delete selected ({sel.count})
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/customers/new">
              <Plus className="h-4 w-4" /> New Customer
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
                aria-label="Select all customers"
              />
            </TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Loans</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Checkbox
                  checked={sel.selected.has(c.id)}
                  onCheckedChange={() => sel.toggle(c.id)}
                  aria-label={`Select ${c.fullName}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{c.customerCode}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/admin/customers/${c.id}`} className="hover:underline">
                  {c.fullName}
                </Link>
              </TableCell>
              <TableCell>{c.mobile}</TableCell>
              <TableCell>{c.branch.name}</TableCell>
              <TableCell>{c._count.loans}</TableCell>
              <TableCell>{fmtDate(c.createdAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Edit">
                    <Link href={`/admin/customers/${c.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => askDelete([c.id])}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                {search ? "No customers match your search." : "No customers yet."}
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
        title={pendingIds.length === 1 ? "Delete this customer?" : `Delete ${pendingIds.length} customers?`}
        description="Soft delete — the record is hidden but preserved. Customers with active loans will be blocked."
        confirmLabel="Delete"
        onConfirm={doDelete}
      />
    </>
  );
}
