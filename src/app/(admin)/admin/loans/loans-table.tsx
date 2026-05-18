"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { IglBadge } from "@/components/ui/igl-badge";
import { Download, FileSpreadsheet, Loader2, Search, X } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

export interface LoanRow {
  id: string;
  accountNo: string;
  loanType: string;
  principal: number;
  paidAmount: number;
  pendingAmount: number;
  nextDueDate: Date | string | null;
  status: string;
  customer: { customerCode: string; fullName: string; mobile: string; fatherOrHusband?: string | null };
  iglSerial?: number;
  branch: { code: string; name: string };
  assignedEmployee: { name: string };
}

export default function LoansTable({ loans }: { loans: LoanRow[] }) {
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const sp = useSearchParams();

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams();
      for (const key of ["status", "type", "branch", "officer"]) {
        const v = sp.get(key);
        if (v) params.set(key, v);
      }
      const qs = params.toString();
      const res = await fetch(`/api/v1/loans/export${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        let msg = `Export failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const m = /filename="?([^"]+)"?/i.exec(disp);
      const fileName = m?.[1] ?? "loan-accounts.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) =>
        l.accountNo.toLowerCase().includes(q) ||
        l.customer.fullName.toLowerCase().includes(q) ||
        l.customer.customerCode.toLowerCase().includes(q) ||
        l.customer.mobile.includes(q) ||
        (l.customer.fatherOrHusband?.toLowerCase().includes(q) ?? false) ||
        l.branch.name.toLowerCase().includes(q) ||
        l.assignedEmployee.name.toLowerCase().includes(q)
    );
  }, [loans, search]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-3 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search account, customer, mobile, branch, officer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <span className="hidden whitespace-nowrap text-xs font-medium text-muted-foreground sm:inline">
            {filtered.length}{search ? ` / ${loans.length}` : ""} loan{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={exporting || loans.length === 0}
            className="gap-2 border-emerald-600/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
                <Download className="h-3.5 w-3.5 opacity-70" />
              </>
            )}
          </Button>
          {exportError && (
            <span className="text-xs text-destructive">{exportError}</span>
          )}
        </div>
      </div>
      <div className="px-1 pt-1 sm:hidden">
        <span className="text-xs font-medium text-muted-foreground">
          {filtered.length}{search ? ` / ${loans.length}` : ""} loan{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Account No</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Father / Husband</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Pending</TableHead>
            <TableHead>Next Due</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Officer</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((l, idx) => (
            <TableRow key={l.id}>
              <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                {idx + 1}
              </TableCell>
              <TableCell className="font-mono text-xs">
                <Link href={`/admin/loans/${l.id}`} className="hover:underline">{l.accountNo}</Link>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{l.customer.fullName}</span>
                  <IglBadge serial={l.iglSerial} />
                </div>
                <div className="text-xs text-muted-foreground">{l.customer.mobile}</div>
              </TableCell>
              <TableCell className="text-sm">
                {l.customer.fatherOrHusband ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>{l.loanType}</TableCell>
              <TableCell>{formatMoney(l.principal)}</TableCell>
              <TableCell>{formatMoney(l.paidAmount)}</TableCell>
              <TableCell>{formatMoney(l.pendingAmount)}</TableCell>
              <TableCell>{fmtDate(l.nextDueDate)}</TableCell>
              <TableCell>{l.branch.name}</TableCell>
              <TableCell>{l.assignedEmployee.name}</TableCell>
              <TableCell><StatusBadge status={l.status} /></TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
                {search ? "No loans match your search." : "No loans yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
