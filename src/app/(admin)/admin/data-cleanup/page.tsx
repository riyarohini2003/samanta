"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  Database,
  Eraser,
  Landmark,
  Loader2,
  PiggyBank,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Counts = {
  notifications: number;
  auditLogs: number;
  sessions: number;
  payments: number;
  repaymentSchedules: number;
  loanAccounts: number;
  loanApplications: number;
  loanAppDocuments: number;
  customers: number;
  customerDocuments: number;
  investors: number;
  investments: number;
  investmentPayouts: number;
};

type LastBackup = {
  id: string;
  createdAt: string;
  filename: string;
  trigger: string;
} | null;

type CategoryKey =
  | "notifications"
  | "audit-logs"
  | "sessions"
  | "payments"
  | "investments"
  | "investors"
  | "loans"
  | "customers"
  | "all";

type CategoryDef = {
  key: CategoryKey;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Tailwind text-color class for the icon. */
  tone: string;
  /** Returns the most relevant headline count from Counts. */
  headlineCount: (c: Counts) => number;
  /** What this clear touches, shown in the preview. */
  affects: (keyof Counts)[];
  /** Extra warning specific to this category, beyond the generic one. */
  extraWarning?: string;
};

const CATEGORIES: CategoryDef[] = [
  {
    key: "notifications",
    title: "Notifications",
    blurb: "Clears every in-app notification for every user. Safe and reversible from backup.",
    icon: Bell,
    tone: "text-sky-500",
    headlineCount: (c) => c.notifications,
    affects: ["notifications"],
  },
  {
    key: "audit-logs",
    title: "Audit Logs",
    blurb: "Removes the forensic trail. Use only after exporting / backing up first.",
    icon: ClipboardList,
    tone: "text-orange-500",
    headlineCount: (c) => c.auditLogs,
    affects: ["auditLogs"],
    extraWarning: "Audit history is your only record of who did what. This is rarely the right action.",
  },
  {
    key: "sessions",
    title: "Sessions",
    blurb: "Force-logout every user. Useful after a credential leak or shared-device incident.",
    icon: KeyRound,
    tone: "text-violet-500",
    headlineCount: (c) => c.sessions,
    affects: ["sessions"],
    extraWarning: "Every signed-in user (including you) will be kicked back to the login screen.",
  },
  {
    key: "payments",
    title: "Payments / Collections",
    blurb: "Wipes all payment receipts and resets every loan's paid/pending balance and schedule to its original unpaid state.",
    icon: Wallet,
    tone: "text-green-500",
    headlineCount: (c) => c.payments,
    affects: ["payments", "repaymentSchedules", "loanAccounts"],
    extraWarning: "Loan books will return to day-zero balances. Receipt numbering resets.",
  },
  {
    key: "investments",
    title: "Investments + Payouts",
    blurb: "Removes every investment and its payout schedule. Investors are kept.",
    icon: Landmark,
    tone: "text-amber-500",
    headlineCount: (c) => c.investments,
    affects: ["investmentPayouts", "investments"],
  },
  {
    key: "investors",
    title: "Investors (full chain)",
    blurb: "Removes investors, their investments, and all payouts.",
    icon: PiggyBank,
    tone: "text-rose-500",
    headlineCount: (c) => c.investors,
    affects: ["investmentPayouts", "investments", "investors"],
  },
  {
    key: "loans",
    title: "Loans (full lending chain)",
    blurb: "Removes loan accounts, applications, schedules, app documents and payments. Customers and branches are kept.",
    icon: Landmark,
    tone: "text-emerald-500",
    headlineCount: (c) => c.loanAccounts,
    affects: [
      "payments",
      "repaymentSchedules",
      "loanAccounts",
      "loanAppDocuments",
      "loanApplications",
    ],
    extraWarning: "Application, loan-account and receipt numbering will reset to 1.",
  },
  {
    key: "customers",
    title: "Customers + Loans",
    blurb: "Removes customers and everything tied to them (documents, applications, loans, schedules, payments).",
    icon: Users,
    tone: "text-cyan-500",
    headlineCount: (c) => c.customers,
    affects: [
      "payments",
      "repaymentSchedules",
      "loanAccounts",
      "loanAppDocuments",
      "loanApplications",
      "customerDocuments",
      "customers",
    ],
    extraWarning: "Branches and employees are kept. Customer/application/loan/receipt numbering resets.",
  },
  {
    key: "all",
    title: "Everything (operational data)",
    blurb: "Wipes all operational data. Users, branches, settings, and counters' branch/employee scope are preserved.",
    icon: Trash2,
    tone: "text-destructive",
    headlineCount: (c) =>
      c.customers + c.loanAccounts + c.investments + c.payments + c.investors,
    affects: [
      "notifications",
      "auditLogs",
      "sessions",
      "payments",
      "repaymentSchedules",
      "loanAccounts",
      "loanAppDocuments",
      "loanApplications",
      "customerDocuments",
      "customers",
      "investmentPayouts",
      "investments",
      "investors",
    ],
    extraWarning: "This is the start-from-scratch reset. Take a backup first — there is no undo.",
  },
];

const AFFECT_LABELS: Record<keyof Counts, string> = {
  notifications: "Notifications",
  auditLogs: "Audit Logs",
  sessions: "Sessions",
  payments: "Payments",
  repaymentSchedules: "Repayment Schedules",
  loanAccounts: "Loan Accounts",
  loanApplications: "Loan Applications",
  loanAppDocuments: "Application Documents",
  customers: "Customers",
  customerDocuments: "Customer Documents",
  investors: "Investors",
  investments: "Investments",
  investmentPayouts: "Investment Payouts",
};

function backupFreshness(lastBackup: LastBackup): {
  status: "fresh" | "stale" | "none";
  ageHours: number | null;
  label: string;
} {
  if (!lastBackup) return { status: "none", ageHours: null, label: "No backup yet" };
  const ageMs = Date.now() - new Date(lastBackup.createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  return {
    status: ageHours <= 24 ? "fresh" : "stale",
    ageHours,
    label:
      ageHours < 1
        ? `${Math.round(ageHours * 60)} min ago`
        : ageHours < 48
          ? `${Math.round(ageHours)} h ago`
          : `${Math.round(ageHours / 24)} d ago`,
  };
}

export default function DataCleanupPage() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [lastBackup, setLastBackup] = useState<LastBackup>(null);

  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  const [previewing, setPreviewing] = useState<CategoryKey | null>(null);
  const [previewImpact, setPreviewImpact] = useState<Record<string, number> | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [committing, setCommitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{
    category: CategoryKey;
    deleted: Record<string, number>;
  } | null>(null);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/data-cleanup");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to load counts");
        return;
      }
      setCounts(json.data.counts);
      setLastBackup(json.data.lastBackup ?? null);
    } catch {
      toast.error("Failed to load counts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const freshness = useMemo(() => backupFreshness(lastBackup), [lastBackup]);
  const backupBlock = freshness.status !== "fresh";

  async function runPreview(cat: CategoryKey) {
    setPreviewing(cat);
    setPreviewImpact(null);
    setLastResult(null);
    setConfirmText("");
    setOpenCategory(cat);
    try {
      const res = await fetch("/api/v1/data-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, mode: "preview" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Preview failed");
        setOpenCategory(null);
        return;
      }
      setPreviewImpact(json.data.impact);
    } catch {
      toast.error("Preview failed");
      setOpenCategory(null);
    } finally {
      setPreviewing(null);
    }
  }

  async function runCommit() {
    if (!openCategory) return;
    setCommitting(true);
    setConfirmOpen(false);
    try {
      const res = await fetch("/api/v1/data-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: openCategory,
          mode: "commit",
          confirm: confirmText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Clear failed");
        return;
      }
      setLastResult({ category: openCategory, deleted: json.data.deleted });
      toast.success(`Cleared: ${json.data.label}`);
      setOpenCategory(null);
      setPreviewImpact(null);
      setConfirmText("");
      fetchCounts();
    } catch {
      toast.error("Clear failed — check your connection");
    } finally {
      setCommitting(false);
    }
  }

  const openDef = useMemo(
    () => CATEGORIES.find((c) => c.key === openCategory) ?? null,
    [openCategory]
  );
  const expectedPhrase = openCategory ? `DELETE ${openCategory.toUpperCase()}` : "";
  const phraseOk = confirmText.trim() === expectedPhrase;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Data Cleanup"
        description="Selectively wipe operational data. Each category clears independently. Super admins only."
      />

      <div className="space-y-6 max-w-5xl">
        {/* ─── Generic danger banner ─────────────────────────────────── */}
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-destructive">
                These actions cannot be undone from the app.
              </p>
              <p className="text-muted-foreground">
                Take a fresh backup before clearing anything. Restoring from a backup is the only
                way to recover. Users, branches, settings, and counter scope for branches/employees
                are never touched by this page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Backup freshness ──────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Backup status
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchCounts}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {freshness.status === "fresh" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Backup is fresh ({freshness.label})
                </span>
              )}
              {freshness.status === "stale" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Last backup {freshness.label} — take a fresh one first
                </span>
              )}
              {freshness.status === "none" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No backup on record yet
                </span>
              )}
              {lastBackup && (
                <span className="text-xs text-muted-foreground font-mono truncate">
                  {lastBackup.filename}
                </span>
              )}
              <Link
                href="/admin/backup"
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <Database className="h-3.5 w-3.5" />
                Go to Backups
              </Link>
            </div>
            {backupBlock && (
              <p className="mt-3 text-xs text-muted-foreground">
                Clearing is blocked until a backup younger than 24&nbsp;h exists. This is enforced
                on the page only — the API will still accept commits, but please don&apos;t skip the
                backup.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Category list ─────────────────────────────────────────── */}
        <div className="grid gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = counts ? cat.headlineCount(counts) : null;
            const isOpen = openCategory === cat.key;
            const isLoadingPreview = previewing === cat.key;
            const isDanger = cat.key === "all";
            return (
              <Card
                key={cat.key}
                className={isDanger ? "border-destructive/40" : undefined}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${cat.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{cat.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{cat.blurb}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Current
                      </div>
                      <div className="text-xl font-semibold tabular-nums">
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          (count ?? 0).toLocaleString()
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cat.extraWarning && (
                    <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/10 dark:text-amber-200">
                      <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                      {cat.extraWarning}
                    </div>
                  )}

                  {!isOpen && (
                    <Button
                      variant={isDanger ? "destructive" : "outline"}
                      onClick={() => runPreview(cat.key)}
                      disabled={isLoadingPreview || loading || committing}
                    >
                      {isLoadingPreview ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eraser className="h-4 w-4" />
                      )}
                      Preview clear
                    </Button>
                  )}

                  {isOpen && (
                    <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Trash2 className="h-4 w-4 text-destructive" />
                          Rows that will be deleted / reset
                        </h4>
                        {!previewImpact ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Calculating impact…
                          </div>
                        ) : (
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {Object.entries(previewImpact).map(([k, v]) => (
                              <div
                                key={k}
                                className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5 text-sm"
                              >
                                <span className="truncate">
                                  {AFFECT_LABELS[k as keyof Counts] ?? k}
                                </span>
                                <span className="ml-2 font-mono text-xs tabular-nums">
                                  {v.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Type{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
                            {expectedPhrase}
                          </code>{" "}
                          to enable the button
                        </label>
                        <Input
                          autoFocus
                          className="mt-2 font-mono"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder={expectedPhrase}
                          disabled={committing}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => setConfirmOpen(true)}
                          disabled={!phraseOk || committing}
                          title={backupBlock ? "No fresh backup — proceed at your own risk" : undefined}
                        >
                          {committing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Clear {cat.title}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setOpenCategory(null);
                            setPreviewImpact(null);
                            setConfirmText("");
                          }}
                          disabled={committing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {lastResult?.category === cat.key && (
                    <div className="rounded-lg border border-green-300/40 bg-green-50 p-3 text-sm dark:border-green-700/40 dark:bg-green-900/10">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        Cleared successfully
                      </div>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2 text-xs">
                        {Object.entries(lastResult.deleted).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{AFFECT_LABELS[k as keyof Counts] ?? k}</span>
                            <span className="font-mono tabular-nums">{v.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        loading={committing}
        title={openDef ? `Clear ${openDef.title}?` : "Clear data?"}
        description={
          openDef
            ? `This will permanently delete the rows listed above. The matching counters will be reset to 1. This action is final — restore from a backup if you change your mind.`
            : undefined
        }
        confirmLabel={openDef ? `Yes, clear ${openDef.title}` : "Yes, clear"}
        onConfirm={runCommit}
      />
    </div>
  );
}
