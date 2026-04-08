"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DatabaseBackup,
  Download,
  Upload,
  Loader2,
  Users,
  Building2,
  UserCircle,
  FileText,
  Landmark,
  Wallet,
  ShieldCheck,
  BarChart3,
  Settings,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Cloud,
  RefreshCw,
  Calendar,
  HardDrive,
} from "lucide-react";

type BackupStats = Record<string, number>;

type BackupRecord = {
  filename: string;
  createdAt: string;
  sizeKB: number;
  stats: BackupStats;
};

type BackupSnapshot = {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
  stats: BackupStats;
  trigger: string;
  createdAt: string;
};

const COLLECTION_META: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "users", label: "Users / Employees", icon: UserCircle },
  { key: "branches", label: "Branches", icon: Building2 },
  { key: "customers", label: "Customers", icon: Users },
  { key: "customerDocuments", label: "Customer Documents", icon: FileText },
  { key: "loanApplications", label: "Loan Applications", icon: FileText },
  { key: "loanAppDocuments", label: "Application Documents", icon: FileText },
  { key: "loanAccounts", label: "Loan Accounts", icon: Landmark },
  { key: "repaymentSchedules", label: "Repayment Schedules", icon: BarChart3 },
  { key: "payments", label: "Payments / Collections", icon: Wallet },
  { key: "auditLogs", label: "Audit Logs", icon: ShieldCheck },
  { key: "investors", label: "Investors", icon: Users },
  { key: "investments", label: "Investments", icon: Landmark },
  { key: "settings", label: "Settings", icon: Settings },
];

type RestorePreview = {
  meta: { version: number; createdAt: string; createdBy: { name: string } };
  stats: BackupStats;
  hasUsers: boolean;
  userCount: number;
} | null;

type RestoreResult = {
  restored: BackupStats;
  note: string;
} | null;

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupRecord | null>(null);

  // Auto-backup history
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);

  // Restore state
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<{ name: string; data: any; sizeKB: number } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<RestorePreview>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult>(null);

  // ─── Fetch auto-backup history ────────────────────────────────────
  const fetchSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const res = await fetch("/api/v1/backups");
      if (res.ok) {
        const json = await res.json();
        setSnapshots(json.data || []);
      }
    } catch {
      // Silently fail — non-critical
    } finally {
      setLoadingSnapshots(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // ─── Download manual backup ───────────────────────────────────────
  async function takeBackup() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/backup");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || "Backup failed");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `samanta-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const text = await blob.text();
      let stats: BackupStats = {};
      try {
        const parsed = JSON.parse(text);
        stats = parsed._stats || {};
      } catch { /* ignore */ }

      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setLastBackup({
        filename,
        createdAt: new Date().toISOString(),
        sizeKB: Math.round(text.length / 1024),
        stats,
      });
      toast.success("Backup downloaded successfully");
    } catch {
      toast.error("Backup failed — check your connection");
    } finally {
      setLoading(false);
    }
  }

  // ─── Upload & preview ─────────────────────────────────────────────
  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data?._meta?.version || !data._stats) {
          toast.error("Invalid backup file — not a Samanta backup");
          return;
        }
        setRestoreFile({ name: f.name, data, sizeKB: Math.round(f.size / 1024) });
        setPreview(null);
        setRestoreResult(null);
        doPreview(data);
      } catch {
        toast.error("Could not parse file — must be valid JSON");
      }
    };
    reader.readAsText(f);
  }

  async function doPreview(data: any) {
    setPreviewing(true);
    try {
      const res = await fetch("/api/v1/backup?mode=preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Preview failed");
        return;
      }
      setPreview(json.data);
    } catch {
      toast.error("Preview failed — check your connection");
    } finally {
      setPreviewing(false);
    }
  }

  function clearFile() {
    setRestoreFile(null);
    setPreview(null);
    setRestoreResult(null);
  }

  // ─── Restore ──────────────────────────────────────────────────────
  async function doRestore() {
    if (!restoreFile) return;
    setRestoring(true);
    setConfirmOpen(false);
    try {
      const res = await fetch("/api/v1/backup?mode=restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restoreFile.data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Restore failed");
        return;
      }
      setRestoreResult(json.data);
      toast.success("Backup restored successfully");
    } catch {
      toast.error("Restore failed — check your connection");
    } finally {
      setRestoring(false);
    }
  }

  const totalRecords = lastBackup
    ? Object.values(lastBackup.stats).reduce((a, b) => a + b, 0)
    : 0;

  const previewTotal = preview
    ? Object.values(preview.stats).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Database Backup"
        description="Automatic daily backups and manual download/restore"
      />

      <div className="space-y-6 max-w-5xl">
        {/* ─── Auto Backup History ───────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Automatic Daily Backups</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Runs every day at 3:00 AM IST. Last 30 days are retained.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchSnapshots}
              disabled={loadingSnapshots}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSnapshots ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSnapshots ? (
              <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading backup history...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground/50 mb-3">
                  <Clock className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">No automatic backups yet.</p>
                <p className="text-xs text-muted-foreground mt-1">The first backup will be created tonight at 3:00 AM IST.</p>
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filename</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Size</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((snap) => (
                      <tr key={snap.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {new Date(snap.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                            <span className="text-xs text-muted-foreground">
                              {new Date(snap.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{snap.filename}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <HardDrive className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {(snap.sizeBytes / 1024).toFixed(0)} KB
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            {snap.trigger === "cron" ? "Auto" : "Manual"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/api/v1/backups/${snap.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Manual Backup Section ─────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Download backup card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Manual Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Creates a complete snapshot of all data including customers, loans,
                payments, employees, branches, audit logs, investors, and settings.
                Passwords are excluded for security.
              </p>

              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="mb-3 text-sm font-semibold">What&apos;s included:</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COLLECTION_META.map((c) => {
                    const Icon = c.icon;
                    const count = lastBackup?.stats[c.key];
                    return (
                      <div key={c.key} className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{c.label}</span>
                        {count != null && (
                          <span className="ml-auto text-xs font-medium text-primary">
                            {count.toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={takeBackup}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Full Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Status card */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backup Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lastBackup ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Backup Complete
                    </div>
                    <InfoRow label="File" value={lastBackup.filename} />
                    <InfoRow
                      label="Created"
                      value={new Date(lastBackup.createdAt).toLocaleString()}
                    />
                    <InfoRow label="Size" value={`${lastBackup.sizeKB.toLocaleString()} KB`} />
                    <InfoRow label="Total Records" value={totalRecords.toLocaleString()} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No backup taken this session. Click the button to create one.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>Auto backup:</strong> Runs daily at 3:00 AM IST. Last 30 days retained.</p>
                <p><strong>Storage:</strong> Backups are stored securely on Cloudinary.</p>
                <p><strong>Security:</strong> User passwords are never included in backups.</p>
                <p><strong>Audit logs:</strong> Last 5,000 entries are included.</p>
                <p><strong>Uploaded files:</strong> Document URLs are included, not the files themselves.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── Restore backup card ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore from Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">This is a destructive operation.</p>
                <p className="text-muted-foreground mt-1">
                  Restoring a backup will <strong>replace all existing data</strong> (customers,
                  loans, payments, etc.) with the data from the backup file. User accounts and
                  logins are preserved. Only Super Admins can perform this action.
                </p>
              </div>
            </div>

            {!restoreFile ? (
              <div>
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Select Backup File
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={onFileSelected}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* File info bar */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{restoreFile.name}</p>
                    <p className="text-xs text-muted-foreground">{restoreFile.sizeKB.toLocaleString()} KB</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearFile} disabled={restoring}>
                    <X className="h-4 w-4" /> Remove
                  </Button>
                </div>

                {previewing && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing backup file...
                  </div>
                )}

                {/* Preview results */}
                {preview && !restoreResult && (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 space-y-3">
                      <h4 className="text-sm font-semibold">Backup Details</h4>
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        <InfoRow label="Backup Date" value={new Date(preview.meta.createdAt).toLocaleString()} />
                        <InfoRow label="Created By" value={preview.meta.createdBy.name} />
                        <InfoRow label="Total Records" value={previewTotal.toLocaleString()} />
                        <InfoRow label="Users in Backup" value={`${preview.userCount} (will not be restored)`} />
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 text-sm font-semibold">Records to Restore</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {COLLECTION_META.map((c) => {
                          const Icon = c.icon;
                          const count = preview.stats[c.key] ?? 0;
                          return (
                            <div key={c.key} className="flex items-center gap-2 text-sm">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{c.label}</span>
                              <span className="ml-auto text-xs font-medium">
                                {count.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={() => setConfirmOpen(true)}
                      disabled={restoring}
                    >
                      {restoring ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <DatabaseBackup className="h-4 w-4" />
                          Restore This Backup
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Restore result */}
                {restoreResult && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Restore Completed Successfully
                    </div>
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 text-sm font-semibold">Restored Records</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {COLLECTION_META.map((c) => {
                          const Icon = c.icon;
                          const count = restoreResult.restored[c.key] ?? 0;
                          return (
                            <div key={c.key} className="flex items-center gap-2 text-sm">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{c.label}</span>
                              <span className={`ml-auto text-xs font-medium ${count > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                                {count.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{restoreResult.note}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        loading={restoring}
        title="Restore backup?"
        description="This will permanently replace ALL existing data (customers, loans, payments, schedules, etc.) with the data from the backup file. User accounts will be preserved. This action cannot be undone."
        confirmLabel="Yes, Restore Backup"
        onConfirm={doRestore}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-all max-w-[60%]">{value}</span>
    </div>
  );
}
