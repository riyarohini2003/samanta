"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  ChevronLeft,
  Calendar,
  Building2,
  UserCircle,
  Users,
  Wallet,
  AlertTriangle,
  PieChart,
  Landmark,
  BookOpen,
  Percent,
  Receipt,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";

// ─── Types ─────────────────────────────────────────────────────────────
type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

type ReportResult = {
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: Record<string, string | number>;
};

type Branch = { id: string; code: string; name: string };
type Employee = { id: string; employeeCode: string; name: string };
type Customer = { id: string; customerCode: string; fullName: string };

type ReportDef = {
  key: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  filters: string[];
  category: string;
};

const REPORT_DEFS: ReportDef[] = [
  {
    key: "daily-collection",
    label: "Daily Collection Sheet",
    desc: "All collections made on a specific date",
    icon: Calendar,
    filters: ["date", "branchId", "employeeId"],
    category: "Collections",
  },
  {
    key: "cash-book",
    label: "Cash Book",
    desc: "Cash-only transactions with running total",
    icon: Wallet,
    filters: ["dateFrom", "dateTo", "branchId"],
    category: "Collections",
  },
  {
    key: "branch-summary",
    label: "Branch Summary",
    desc: "Loan portfolio summary by branch",
    icon: Building2,
    filters: [],
    category: "Organization",
  },
  {
    key: "employee-performance",
    label: "Employee Performance",
    desc: "Collection and loan metrics per employee",
    icon: UserCircle,
    filters: ["dateFrom", "dateTo", "branchId", "employeeId"],
    category: "Organization",
  },
  {
    key: "due-list",
    label: "Due List",
    desc: "Customers with dues on a specific date",
    icon: ClipboardList,
    filters: ["date", "branchId", "employeeId", "loanType"],
    category: "Collections",
  },
  {
    key: "overdue-npa",
    label: "Overdue / NPA",
    desc: "All overdue and NPA loan accounts",
    icon: AlertTriangle,
    filters: ["branchId", "employeeId", "status"],
    category: "Risk",
  },
  {
    key: "portfolio-aging",
    label: "Portfolio Aging",
    desc: "Aging analysis of outstanding loans",
    icon: PieChart,
    filters: ["branchId"],
    category: "Risk",
  },
  {
    key: "disbursement-register",
    label: "Disbursement Register",
    desc: "All loan disbursements in a period",
    icon: Landmark,
    filters: ["dateFrom", "dateTo", "branchId", "loanType"],
    category: "Lending",
  },
  {
    key: "customer-ledger",
    label: "Customer Ledger",
    desc: "Full account statement for a customer",
    icon: BookOpen,
    filters: ["customerId"],
    category: "Lending",
  },
  {
    key: "interest-report",
    label: "Interest Report",
    desc: "Interest earned, collected, and pending",
    icon: Percent,
    filters: ["branchId"],
    category: "Finance",
  },
  {
    key: "tax-report",
    label: "Tax Report",
    desc: "Income summary for tax filing",
    icon: Receipt,
    filters: ["dateFrom", "dateTo"],
    category: "Finance",
  },
  {
    key: "audit-report",
    label: "Audit Report",
    desc: "System activity and audit trail",
    icon: ShieldCheck,
    filters: ["dateFrom", "dateTo", "employeeId"],
    category: "Compliance",
  },
];

const CATEGORIES = ["Collections", "Organization", "Lending", "Risk", "Finance", "Compliance"];

// ─── Component ─────────────────────────────────────────────────────────
export function ReportsHub({
  branches,
  employees,
  customers,
}: {
  branches: Branch[];
  employees: Employee[];
  customers: Customer[];
}) {
  const [selected, setSelected] = React.useState<ReportDef | null>(null);
  const [report, setReport] = React.useState<ReportResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState<"pdf" | "excel" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [date, setDate] = React.useState(today());
  const [dateFrom, setDateFrom] = React.useState(firstOfMonth());
  const [dateTo, setDateTo] = React.useState(today());
  const [branchId, setBranchId] = React.useState("");
  const [employeeId, setEmployeeId] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [loanType, setLoanType] = React.useState("");
  const [status, setStatus] = React.useState("");

  function resetFilters() {
    setDate(today());
    setDateFrom(firstOfMonth());
    setDateTo(today());
    setBranchId("");
    setEmployeeId("");
    setCustomerId("");
    setLoanType("");
    setStatus("");
  }

  async function generate() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setReport(null);

    const params = new URLSearchParams({ type: selected.key });
    if (selected.filters.includes("date") && date) params.set("date", date);
    if (selected.filters.includes("dateFrom") && dateFrom) params.set("dateFrom", dateFrom);
    if (selected.filters.includes("dateTo") && dateTo) params.set("dateTo", dateTo);
    if (selected.filters.includes("branchId") && branchId) params.set("branchId", branchId);
    if (selected.filters.includes("employeeId") && employeeId) params.set("employeeId", employeeId);
    if (selected.filters.includes("customerId") && customerId) params.set("customerId", customerId);
    if (selected.filters.includes("loanType") && loanType) params.set("loanType", loanType);
    if (selected.filters.includes("status") && status) params.set("status", status);

    try {
      const res = await fetch(`/api/v1/reports?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate report");
      setReport(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "excel") {
    if (!report) return;
    setExporting(format);
    try {
      if (format === "pdf") {
        const { exportPdf } = await import("@/lib/export-pdf");
        exportPdf(report);
      } else {
        const { exportExcel } = await import("@/lib/export-excel");
        await exportExcel(report);
      }
    } catch (e: any) {
      setError(`Export failed: ${e.message}`);
    } finally {
      setExporting(null);
    }
  }

  // ─── Report selection view ────────────────────────────────────────
  if (!selected) {
    return (
      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const reports = REPORT_DEFS.filter((r) => r.category === cat);
          if (reports.length === 0) return null;
          return (
            <div key={cat}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {cat}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((r) => {
                  const Icon = r.icon;
                  return (
                    <Card
                      key={r.key}
                      className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
                      onClick={() => {
                        resetFilters();
                        setReport(null);
                        setError(null);
                        setSelected(r);
                      }}
                    >
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{r.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Report detail view ───────────────────────────────────────────
  const Icon = selected.icon;

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSelected(null);
            setReport(null);
            setError(null);
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{selected.label}</h3>
        </div>
        <Badge className="ml-2 text-xs">{selected.category}</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {selected.filters.includes("date") && (
              <div className="w-40">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
            {selected.filters.includes("dateFrom") && (
              <div className="w-40">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
            )}
            {selected.filters.includes("dateTo") && (
              <div className="w-40">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            )}
            {selected.filters.includes("branchId") && (
              <div className="w-44">
                <Label className="text-xs">Branch</Label>
                <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {selected.filters.includes("employeeId") && (
              <div className="w-44">
                <Label className="text-xs">Employee</Label>
                <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="">All Employees</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeCode} - {e.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {selected.filters.includes("customerId") && (
              <div className="w-52">
                <Label className="text-xs">Customer</Label>
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerCode} - {c.fullName}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {selected.filters.includes("loanType") && (
              <div className="w-36">
                <Label className="text-xs">Loan Type</Label>
                <Select value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </Select>
              </div>
            )}
            {selected.filters.includes("status") && (
              <div className="w-36">
                <Label className="text-xs">Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="NPA">NPA</option>
                </Select>
              </div>
            )}

            <Button onClick={generate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Report output */}
      {report && (
        <>
          {/* Summary cards */}
          {report.summary && Object.keys(report.summary).length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(report.summary).map(([key, val]) => (
                <Card key={key}>
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {key}
                    </p>
                    <p className="mt-1 text-xl font-bold">{val}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Export buttons + row count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {report.rows.length} record{report.rows.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
              >
                {exporting === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                disabled={exporting !== null}
              >
                {exporting === "excel" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Export Excel
              </Button>
            </div>
          </div>

          {/* Data table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {report.columns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                                ? "text-center"
                                : ""
                          }
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={report.columns.length} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.rows.map((row, i) => (
                        <TableRow key={i}>
                          {report.columns.map((col) => {
                            const val = row[col.key];
                            return (
                              <TableCell
                                key={col.key}
                                className={
                                  col.align === "right"
                                    ? "text-right tabular-nums"
                                    : col.align === "center"
                                      ? "text-center"
                                      : ""
                                }
                              >
                                {val != null
                                  ? typeof val === "number" && col.align === "right"
                                    ? val.toLocaleString("en-IN")
                                    : String(val)
                                  : "—"}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split("T")[0];
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
