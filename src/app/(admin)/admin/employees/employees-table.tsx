"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRole } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, KeyRound, LogIn, Search, RefreshCw, Loader2 } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { useRowSelection } from "@/lib/use-row-selection";
import { runBulkDelete } from "@/lib/bulk-delete";

export interface EmployeeRow {
  id: string;
  employeeCode: string;
  name: string;
  loginId: string;
  role: string;
  mobile: string;
  joiningDate: Date | string | null;
  isActive: boolean;
  branch: { code: string; name: string } | null;
}

function randomPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "#1";
}

export default function EmployeesTable({ employees }: { employees: EmployeeRow[] }) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const haystack = [
        e.name,
        e.loginId,
        e.employeeCode,
        e.mobile,
        e.role,
        e.branch?.name ?? "",
        e.branch?.code ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, query]);

  const ids = useMemo(() => filtered.map((e) => e.id), [filtered]);
  const sel = useRowSelection(ids);

  // Reset selection whenever the filter changes so the "select all" checkbox state
  // and bulk actions always match the currently visible rows.
  useEffect(() => {
    sel.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Password reset dialog state
  const [pwTarget, setPwTarget] = useState<EmployeeRow | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Impersonate confirm state
  const [impTarget, setImpTarget] = useState<EmployeeRow | null>(null);
  const [impLoading, setImpLoading] = useState(false);

  function askDelete(targetIds: string[]) {
    if (targetIds.length === 0) return;
    setPendingIds(targetIds);
    setConfirmOpen(true);
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await runBulkDelete("/api/v1/employees", pendingIds);
      setConfirmOpen(false);
      sel.clear();
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function openResetPassword(u: EmployeeRow) {
    setPwTarget(u);
    setNewPw("");
  }

  async function submitResetPassword() {
    if (!pwTarget) return;
    if (newPw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`/api/v1/employees/${pwTarget.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to reset password");
        return;
      }
      toast.success(`Password reset for ${pwTarget.name}. All their sessions have been logged out.`);
      setPwTarget(null);
      setNewPw("");
    } finally {
      setPwSaving(false);
    }
  }

  async function doImpersonate() {
    if (!impTarget) return;
    setImpLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${impTarget.id}/impersonate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to log in as employee");
        setImpLoading(false);
        return;
      }
      toast.success(`Logged in as ${impTarget.name}`);
      const redirect = (json?.data?.redirect as string) || "/admin/dashboard";
      // Full navigation so middleware picks up the new cookies.
      window.location.href = redirect;
    } catch (e) {
      toast.error("Failed to log in as employee");
      setImpLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, login ID, code, mobile, branch…"
              className="pl-9"
            />
          </div>
          <div className="whitespace-nowrap text-sm text-muted-foreground">
            {sel.count > 0 ? (
              <span>{sel.count} selected</span>
            ) : (
              <span>
                {filtered.length} of {employees.length} employee{employees.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {sel.count > 0 && (
            <Button variant="destructive" onClick={() => askDelete(sel.ids)}>
              <Trash2 className="h-4 w-4" /> Delete selected ({sel.count})
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" /> New Employee
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
                aria-label="Select all employees"
              />
            </TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Login ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <Checkbox
                  checked={sel.selected.has(u.id)}
                  onCheckedChange={() => sel.toggle(u.id)}
                  aria-label={`Select ${u.name}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">{u.employeeCode}</TableCell>
              <TableCell className="font-medium">
                <button
                  type="button"
                  onClick={() => setImpTarget(u)}
                  title={`Log in as ${u.name}`}
                  className="text-left text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:underline"
                >
                  {u.name}
                </button>
              </TableCell>
              <TableCell className="font-mono text-xs">{u.loginId}</TableCell>
              <TableCell>{formatRole(u.role)}</TableCell>
              <TableCell>{u.branch?.name ?? "—"}</TableCell>
              <TableCell>{u.mobile}</TableCell>
              <TableCell>{fmtDate(u.joiningDate)}</TableCell>
              <TableCell><StatusBadge status={u.isActive ? "ACTIVE" : "CLOSED"} /></TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Log in as this employee"
                    onClick={() => setImpTarget(u)}
                  >
                    <LogIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Reset password"
                    onClick={() => openResetPassword(u)}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Edit">
                    <Link href={`/admin/employees/${u.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => askDelete([u.id])}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                {employees.length === 0 ? "No employees yet." : "No employees match your search."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        loading={deleting}
        title={pendingIds.length === 1 ? "Delete this employee?" : `Delete ${pendingIds.length} employees?`}
        description="Soft delete — the account is hidden and deactivated but preserved. Employees with active loans assigned will be blocked."
        confirmLabel="Delete"
        onConfirm={doDelete}
      />

      <ConfirmDialog
        open={Boolean(impTarget)}
        onOpenChange={(v) => {
          if (!v && !impLoading) setImpTarget(null);
        }}
        loading={impLoading}
        title={impTarget ? `Log in as ${impTarget.name}?` : "Log in as employee?"}
        description={
          impTarget ? (
            <>
              You will be signed out of your admin account and signed in as{" "}
              <span className="font-mono">{impTarget.loginId}</span> ({formatRole(impTarget.role)}). To
              return, log out and sign back in with your own credentials.
            </>
          ) : null
        }
        confirmLabel="Log in as employee"
        onConfirm={doImpersonate}
      />

      <Dialog
        open={Boolean(pwTarget)}
        onOpenChange={(v) => {
          if (!v && !pwSaving) {
            setPwTarget(null);
            setNewPw("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {pwTarget ? (
                <>
                  Set a new password for <span className="font-medium">{pwTarget.name}</span> (
                  <span className="font-mono">{pwTarget.loginId}</span>). All active sessions for this
                  employee will be terminated.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reset-new-password">New password</Label>
            <div className="flex gap-2">
              <Input
                id="reset-new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Minimum 6 characters"
                autoFocus
                disabled={pwSaving}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Generate"
                onClick={() => setNewPw(randomPassword())}
                disabled={pwSaving}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this password with the employee over a secure channel.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPwTarget(null);
                setNewPw("");
              }}
              disabled={pwSaving}
            >
              Cancel
            </Button>
            <Button onClick={submitResetPassword} disabled={pwSaving || newPw.length < 6}>
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
