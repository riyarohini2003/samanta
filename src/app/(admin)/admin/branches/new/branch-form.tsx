"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface BranchFormInitial {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactNumber?: string;
}

interface BranchFormProps {
  initial?: BranchFormInitial;
}

export default function BranchForm({ initial }: BranchFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    contactNumber: initial?.contactNumber ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/branches/${initial!.id}` : "/api/v1/branches";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || `Failed to ${isEdit ? "update" : "create"} branch`);
        return;
      }
      toast.success(`Branch ${isEdit ? "updated" : "created"}`);
      router.push("/admin/branches");
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
            <Label>Branch Name *</Label>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address *</Label>
            <Input required value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>City *</Label>
            <Input required value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>State *</Label>
            <Input required value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>PIN Code *</Label>
            <Input required value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact Number *</Label>
            <Input required value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Branch"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
