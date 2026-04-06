"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

type Branch = { id: string; code: string; name: string };

export interface EmployeeFormInitial {
  id?: string;
  name?: string;
  loginId?: string;
  email?: string | null;
  mobile?: string;
  role?: "ADMIN" | "BRANCH_MANAGER" | "EMPLOYEE";
  branchId?: string | null;
  address?: string | null;
  joiningDate?: Date | string | null;
  isActive?: boolean;
}

function randomPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "#1";
}

export default function EmployeeForm({ branches, initial }: { branches: Branch[]; initial?: EmployeeFormInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const toDateStr = (v: Date | string | null | undefined) => {
    if (!v) return "";
    const d = typeof v === "string" ? new Date(v) : v;
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    loginId: initial?.loginId ?? "",
    password: "",
    email: initial?.email ?? "",
    mobile: initial?.mobile ?? "",
    role: (initial?.role ?? "EMPLOYEE") as "ADMIN" | "BRANCH_MANAGER" | "EMPLOYEE",
    branchId: initial?.branchId ?? branches[0]?.id ?? "",
    address: initial?.address ?? "",
    joiningDate: toDateStr(initial?.joiningDate) || new Date().toISOString().slice(0, 10),
    isActive: initial?.isActive ?? true,
  });

  function set<K extends keyof typeof form>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/employees/${initial!.id}` : "/api/v1/employees";
      const method = isEdit ? "PATCH" : "POST";
      // Only send fields each schema expects
      const payload = isEdit
        ? {
            name: form.name,
            email: form.email || undefined,
            mobile: form.mobile,
            role: form.role,
            branchId: form.branchId,
            address: form.address || undefined,
            joiningDate: form.joiningDate || undefined,
            isActive: form.isActive,
          }
        : {
            name: form.name,
            loginId: form.loginId,
            password: form.password,
            email: form.email || undefined,
            mobile: form.mobile,
            role: form.role,
            branchId: form.branchId,
            address: form.address || undefined,
            joiningDate: form.joiningDate || undefined,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const fieldErrors = json.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          const msgs = Object.entries(fieldErrors).map(([f, errs]) => `${f}: ${errs.join(", ")}`);
          toast.error(msgs.join(" | "));
        } else {
          toast.error(json.error || "Failed");
        }
        return;
      }
      toast.success(
        isEdit ? "Employee updated" : "Employee created. Share the login ID and password with them."
      );
      router.push("/admin/employees");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label>Login ID *</Label>
                <Input required value={form.loginId} onChange={(e) => set("loginId", e.target.value)} placeholder="e.g. rahul.k or +919876543210" />
                {/^\d+$/.test(form.loginId) && form.loginId.length > 0 ? (
                  <p className="text-xs text-destructive">Plain numbers not allowed. Add + country code (e.g. +91{form.loginId}) or use a username.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Can be a username or phone number with +country code</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="flex gap-2">
                  <Input required value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <Button type="button" variant="outline" size="icon" onClick={() => set("password", randomPassword())} title="Generate">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
          {isEdit && (
            <div className="space-y-2">
              <Label>Login ID</Label>
              <Input value={form.loginId} disabled />
            </div>
          )}
          <div className="space-y-2">
            <Label>Mobile *</Label>
            <Input required value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="EMPLOYEE">Employee</option>
              <option value="BRANCH_MANAGER">Branch Manager</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Branch *</Label>
            <Select required value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
              {branches.length === 0 && <option value="">-- No branches yet --</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} · {b.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Joining Date</Label>
            <Input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.isActive ? "1" : "0"} onChange={(e) => set("isActive", e.target.value === "1")}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </div>
          )}
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
            <Button type="submit" disabled={loading || branches.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Employee"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
