"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { IglBadge } from "@/components/ui/igl-badge";
import { Search } from "lucide-react";
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
  customer: { customerCode: string; fullName: string; mobile: string };
  iglSerial?: number;
  branch: { code: string; name: string };
  assignedEmployee: { name: string };
}

export default function LoansTable({ loans }: { loans: LoanRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) =>
        l.accountNo.toLowerCase().includes(q) ||
        l.customer.fullName.toLowerCase().includes(q) ||
        l.customer.customerCode.toLowerCase().includes(q) ||
        l.customer.mobile.includes(q) ||
        l.branch.name.toLowerCase().includes(q) ||
        l.assignedEmployee.name.toLowerCase().includes(q)
    );
  }, [loans, search]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by account, customer, mobile, branch, officer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} loan{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account No</TableHead>
            <TableHead>Customer</TableHead>
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
          {filtered.map((l) => (
            <TableRow key={l.id}>
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
              <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                {search ? "No loans match your search." : "No loans yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
