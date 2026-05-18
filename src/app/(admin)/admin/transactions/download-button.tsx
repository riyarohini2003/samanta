"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type ExportPayload = {
  filters: Record<string, string>;
  generatedAt: string;
  summary: Record<string, string | number>;
  disbursements: Record<string, string | number | null>[];
  collections: Record<string, string | number | null>[];
};

export function DownloadTransactionsButton() {
  const sp = useSearchParams();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const from = sp.get("from");
      const to = sp.get("to");
      const branchId = sp.get("branchId");
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (branchId) params.set("branchId", branchId);

      const res = await fetch(
        `/api/v1/transactions/export?${params.toString()}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch report");
      }
      const data = json.data as ExportPayload;

      const { exportTransactionsExcel } = await import(
        "@/lib/export-transactions-excel"
      );

      const branchPart = data.filters.Branch?.replace(/[^a-zA-Z0-9]+/g, "_") ||
        "all";
      const fileName = `Transactions_${from ?? "from"}_to_${to ?? "to"}_${branchPart}`;

      await exportTransactionsExcel({
        fileName,
        generatedAt: data.generatedAt,
        filters: data.filters,
        summary: data.summary,
        sheets: [
          {
            name: "Disbursements",
            title: "Disbursements",
            columns: [
              { key: "date", label: "Date" },
              { key: "accountNo", label: "Loan A/C" },
              { key: "customerCode", label: "Cust Code" },
              { key: "customer", label: "Customer" },
              { key: "mobile", label: "Mobile" },
              { key: "branch", label: "Branch" },
              { key: "loanType", label: "Type" },
              { key: "mode", label: "Mode" },
              { key: "principal", label: "Principal", align: "right", money: true },
              { key: "interest", label: "Interest", align: "right", money: true },
              { key: "totalPayable", label: "Total Payable", align: "right", money: true },
              { key: "emi", label: "EMI", align: "right", money: true },
              { key: "processingFee", label: "Proc. Fee", align: "right", money: true },
              { key: "interestRate", label: "Rate %", align: "right" },
              { key: "maturity", label: "Maturity" },
              { key: "employee", label: "Employee" },
              { key: "employeeCode", label: "Emp Code" },
            ],
            rows: data.disbursements,
          },
          {
            name: "Collections",
            title: "Collections",
            columns: [
              { key: "when", label: "When" },
              { key: "receiptNo", label: "Receipt #" },
              { key: "customerCode", label: "Cust Code" },
              { key: "customer", label: "Customer" },
              { key: "mobile", label: "Mobile" },
              { key: "accountNo", label: "Loan A/C" },
              { key: "branch", label: "Branch" },
              { key: "loanType", label: "Type" },
              { key: "mode", label: "Mode" },
              { key: "amount", label: "Amount", align: "right", money: true },
              { key: "penalty", label: "Penalty", align: "right", money: true },
              { key: "collectedBy", label: "Collected By" },
              { key: "collectedByCode", label: "Emp Code" },
            ],
            rows: data.collections,
          },
        ],
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to download report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleDownload} disabled={busy} variant="outline">
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </>
        )}
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
