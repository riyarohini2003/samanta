"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";

interface CustomerRow {
  id: string;
  customerCode: string;
  fullName: string;
  mobile: string;
  createdAt: Date | string;
  _count: { loans: number };
}

export default function EmployeeCustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.mobile.includes(q)
    );
  }, [customers, search]);

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
            {filtered.length} customer{filtered.length === 1 ? "" : "s"}
          </span>
          <Button asChild>
            <Link href="/employee/customers/new">
              <Plus className="h-4 w-4" /> New Customer
            </Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Loans</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.customerCode}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/employee/customers/${c.id}`} className="hover:underline">{c.fullName}</Link>
              </TableCell>
              <TableCell>{c.mobile}</TableCell>
              <TableCell>{c._count.loans}</TableCell>
              <TableCell>{fmtDate(c.createdAt)}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                {search ? "No customers match your search." : "No customers yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}
