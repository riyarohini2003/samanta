"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck2,
  PlayCircle,
  Building2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ImportReport = {
  mode: "dry-run" | "commit";
  totals: { loansRead: number; uniqueCustomers: number; loansWithPriorCollection: number };
  summary: { ok: number; skipped: number; error: number };
  rows: { sheet: string; row: number; key: string; outcome: "OK" | "SKIPPED" | "ERROR"; message: string }[];
};

type BranchOpt = { id: string; code: string; name: string };
type EmployeeOpt = { id: string; employeeCode: string; name: string; role: string; branchId: string | null };

export default function BulkImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState<"template" | "sample" | null>(null);
  const [running, setRunning] = useState<"dry-run" | "commit" | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [branches, setBranches] = useState<BranchOpt[]>([]);
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/bulk-import", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          if (!cancelled) toast.error(j?.error ?? `Failed to load branches/employees (HTTP ${res.status})`);
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        const b = (json.data?.branches ?? []) as BranchOpt[];
        const e = (json.data?.employees ?? []) as EmployeeOpt[];
        setBranches(b);
        setEmployees(e);
        if (b.length === 1) setBranchId(b[0].id);
        if (e.length === 1) setEmployeeId(e[0].id);
      } catch (err) {
        if (!cancelled) toast.error(`Failed to load branches/employees: ${(err as Error).message}`);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const branchById = new Map(branches.map((b) => [b.id, b]));

  async function download(kind: "template" | "sample") {
    setDownloading(kind);
    try {
      const res = await fetch(`/api/v1/bulk-import/${kind}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        toast.error(j?.error ?? `Download failed`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = kind === "template" ? "bulk-import-template.xlsx" : "bulk-import-sample.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${kind === "template" ? "Template" : "Sample sheet"} downloaded`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(null);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xlsm")) {
      toast.error("Please upload a .xlsx file");
      return;
    }
    setFile(f);
    setReport(null);
  }

  async function runImport(commit: boolean) {
    if (!file) return;
    if (!branchId) { toast.error("Pick a branch first"); return; }
    if (!employeeId) { toast.error("Pick an assigned employee first"); return; }
    setRunning(commit ? "commit" : "dry-run");
    setConfirmOpen(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("defaultBranchId", branchId);
      fd.append("defaultAssignedEmployeeId", employeeId);
      const res = await fetch(`/api/v1/bulk-import?commit=${commit}`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Import failed");
        return;
      }
      setReport(json.data as ImportReport);
      const r = json.data as ImportReport;
      if (r.summary.error > 0) toast.warning(`${r.summary.error} errors found — see report below`);
      else if (commit) toast.success(`Import complete: ${r.summary.ok} ok, ${r.summary.skipped} skipped`);
      else toast.success(`Dry-run passed: ${r.totals.loansRead} loans, ${r.totals.uniqueCustomers} customers`);
    } catch {
      toast.error("Import failed — check your connection");
    } finally {
      setRunning(null);
    }
  }

  const setupOk = !!branchId && !!employeeId;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Bulk Import" description="Import existing customers, loans, and prior collections from your Excel register" />

      <div className="space-y-6 max-w-5xl">
        {/* ─── Column reference ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Expected columns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Your sheet must have these column headers on row 1 (any order). One row = one loan.
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="grid sm:grid-cols-2 gap-y-1 gap-x-4 font-mono">
                <span><strong className="text-foreground">Loan No</strong> — serial (1, 2, 3, …)</span>
                <span><strong className="text-foreground">EMI</strong> — per-instalment amount</span>
                <span><strong className="text-foreground">Name</strong> — customer full name</span>
                <span><strong className="text-foreground">Loan Type</strong> — DAILY / WEEKLY / MONTHLY</span>
                <span><strong className="text-foreground">fatherOrHusband Name</strong></span>
                <span><strong className="text-foreground">No Of Days of emi</strong> — tenure count</span>
                <span><strong className="text-foreground">Address</strong></span>
                <span><strong className="text-foreground">start Date</strong></span>
                <span><strong className="text-foreground">Phone No</strong> — 10 digits</span>
                <span><strong className="text-foreground">Collection</strong> — already paid</span>
                <span><strong className="text-foreground">Principal</strong> — loan amount</span>
                <span><strong className="text-foreground">Due</strong> — outstanding</span>
                <span><strong className="text-foreground">Amount to</strong> — total to repay</span>
                <span><strong className="text-foreground">Closing Date</strong></span>
                <span className="sm:col-span-2"><strong className="text-foreground">Status</strong> — ACTIVE / CLOSED</span>
              </div>
              <p className="mt-3 text-muted-foreground">
                <strong className="text-foreground">Loan Type</strong> controls the instalment frequency:
                DAILY → tenure in days, WEEKLY → weeks, MONTHLY → months. Defaults to DAILY if left blank.
                Interest rate is derived from <code className="mx-1">Amount to − Principal</code> over the tenure.
                Branch and assigned employee are picked below (Step 2) — they&apos;re not in the sheet.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Step 1: Download ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Step 1 — Download a template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Template</strong> is blank with the correct headers.
              <strong className="text-foreground"> Sample</strong> includes 5 example loans — useful to dry-run on a dev environment first.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => download("template")} disabled={downloading !== null}>
                {downloading === "template" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Blank Template
              </Button>
              <Button variant="outline" onClick={() => download("sample")} disabled={downloading !== null}>
                {downloading === "sample" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Sample (with example data)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Step 2: Branch + employee ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Step 2 — Branch & assigned employee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Every imported customer and loan will be attached to this branch, and every loan will be assigned to
              this collection employee. If your data spans multiple branches, run one import per branch.
            </p>
            {loadingMeta ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading branches & employees…
              </div>
            ) : branches.length === 0 || employees.length === 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {branches.length === 0
                  ? "No active branches found. Create at least one branch under Admin → Branches before importing."
                  : "No active employees found. Create at least one employee under Admin → Employees before importing."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 block">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Branch ({branches.length})
                  </span>
                  <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">— select branch —</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Assigned employee ({employees.length})
                  </span>
                  <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                    <option value="">— select employee —</option>
                    {employees.map((e) => {
                      const br = e.branchId ? branchById.get(e.branchId) : null;
                      const brLabel = br ? ` · ${br.code}` : "";
                      return (
                        <option key={e.id} value={e.id}>
                          {e.employeeCode} — {e.name} ({e.role}{brLabel})
                        </option>
                      );
                    })}
                  </Select>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Step 3: Upload ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Step 3 — Upload your filled file
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Select Excel file (.xlsx)
                </Button>
                <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={onPick} />
              </>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setReport(null); }} disabled={running !== null}>
                  <X className="h-4 w-4" /> Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Step 4: Validate ──────────────────────────────────────── */}
        {file && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5" />
                Step 4 — Validate (dry-run)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reads every row, checks the maths (EMI × tenure ≈ Amount to), and validates dates and phone numbers.
                <strong className="text-foreground"> No database writes.</strong> Re-run after fixing rows.
              </p>
              <Button onClick={() => runImport(false)} disabled={running !== null || !setupOk}>
                {running === "dry-run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                Run Validation
              </Button>
              {!setupOk && (
                <p className="text-xs text-amber-600 dark:text-amber-400">Pick a branch and employee in Step 2 first.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Report ────────────────────────────────────────────────── */}
        {report && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {report.summary.error > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {report.mode === "commit" ? "Import Result" : "Validation Result"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Loans in file" value={report.totals.loansRead} />
                <Stat label="Unique customers" value={report.totals.uniqueCustomers} />
                <Stat label="Loans w/ prior collection" value={report.totals.loansWithPriorCollection} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="OK" value={report.summary.ok} color="text-green-600" />
                <Stat label="Skipped" value={report.summary.skipped} color="text-amber-600" />
                <Stat label="Errors" value={report.summary.error} color={report.summary.error > 0 ? "text-destructive" : undefined} />
              </div>

              {report.summary.error > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">Errors — fix these and re-validate:</p>
                  <div className="max-h-72 overflow-auto rounded border bg-background">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold">sheet</th>
                          <th className="px-2 py-1.5 text-left font-semibold">row</th>
                          <th className="px-2 py-1.5 text-left font-semibold">message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rows.filter((r) => r.outcome === "ERROR").map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1 font-mono">{r.sheet}</td>
                            <td className="px-2 py-1 font-mono">{r.row || "—"}</td>
                            <td className="px-2 py-1">{r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Commit button — only show after a successful dry-run */}
              {report.mode === "dry-run" && report.summary.error === 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex items-start gap-3 dark:border-amber-700/40 dark:bg-amber-900/10">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-200">Ready to commit</p>
                    <p className="text-amber-800/80 dark:text-amber-200/70 mt-1">
                      Validation passed. Clicking <strong>Commit Import</strong> will write {report.totals.uniqueCustomers} customers and {report.totals.loansRead} loans to the database. <strong>Take a backup first.</strong>
                    </p>
                    <Button
                      className="mt-3"
                      onClick={() => setConfirmOpen(true)}
                      disabled={running !== null}
                    >
                      {running === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                      Commit Import to Database
                    </Button>
                  </div>
                </div>
              )}

              {report.mode === "commit" && report.summary.error === 0 && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-700/40 dark:bg-green-900/10 text-sm text-green-900 dark:text-green-200">
                  <p className="font-medium">Import complete.</p>
                  <p className="mt-1 text-green-800/80 dark:text-green-200/70">Open the Customers, Loans, and Collections pages to verify the imported records.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        loading={running === "commit"}
        title="Commit bulk import?"
        description={
          report
            ? `This will create ${report.totals.uniqueCustomers} customer(s) and ${report.totals.loansRead} loan(s). Customers/loans that already exist will be skipped. Continue?`
            : "Continue with import?"
        }
        confirmLabel="Yes, Commit Import"
        onConfirm={() => runImport(true)}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color ?? ""}`}>{value.toLocaleString()}</div>
    </div>
  );
}
