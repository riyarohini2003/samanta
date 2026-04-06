"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface InvestorFormInitial {
  id?: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  pan?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
}

interface InvestorFormProps {
  initial?: InvestorFormInitial;
}

export default function InvestorForm({ initial }: InvestorFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: initial?.fullName ?? "",
    mobile: initial?.mobile ?? "",
    email: initial?.email ?? "",
    pan: initial?.pan ?? "",
    address: initial?.address ?? "",
    bankName: initial?.bankName ?? "",
    bankAccount: initial?.bankAccount ?? "",
    ifsc: initial?.ifsc ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/investors/${initial!.id}` : "/api/v1/investors";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || `Failed to ${isEdit ? "update" : "create"} investor`);
        return;
      }
      toast.success(`Investor ${isEdit ? "updated" : "created"}`);
      router.push("/admin/investors");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Full Name *</Label>
            <Input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mobile *</Label>
            <Input required value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>PAN</Label>
            <Input value={form.pan} onChange={(e) => set("pan", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bank Account</Label>
            <Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>IFSC</Label>
            <Input value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Add Investor"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
