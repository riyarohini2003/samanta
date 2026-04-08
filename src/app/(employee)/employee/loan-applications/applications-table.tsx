"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

interface AppRow {
  id: string;
  applicationNo: string;
  loanType: string;
  principal: number;
  installmentAmount: number;
  status: string;
  createdAt: Date | string;
  customer: { fullName: string; mobile: string };
}

export default function EmployeeApplicationsTable({ apps }: { apps: AppRow[] }) {
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  async function handlePdf(id: string, mode: "download" | "print") {
    setPdfLoading(id);
    try {
      const res = await fetch(`/api/v1/loan-applications/${id}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Failed to load"); return; }
      const { generateApplicationPdf } = await import("@/lib/application-pdf");
      generateApplicationPdf(json.data, mode);
    } catch { toast.error("Failed to generate PDF"); }
    finally { setPdfLoading(null); }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>App No</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Installment</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Print / PDF</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apps.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-mono text-xs">
              <Link href={`/employee/loan-applications/${a.id}`} className="hover:underline">
                {a.applicationNo}
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              <Link href={`/employee/loan-applications/${a.id}`} className="hover:underline">
                {a.customer.fullName}
              </Link>
            </TableCell>
            <TableCell>{a.loanType}</TableCell>
            <TableCell>{formatMoney(a.principal)}</TableCell>
            <TableCell>{formatMoney(a.installmentAmount)}</TableCell>
            <TableCell>{fmtDate(a.createdAt)}</TableCell>
            <TableCell><StatusBadge status={a.status} /></TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Print"
                  disabled={pdfLoading === a.id}
                  onClick={() => handlePdf(a.id, "print")}
                >
                  {pdfLoading === a.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Printer className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Download PDF"
                  disabled={pdfLoading === a.id}
                  onClick={() => handlePdf(a.id, "download")}
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {apps.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
              No applications yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
