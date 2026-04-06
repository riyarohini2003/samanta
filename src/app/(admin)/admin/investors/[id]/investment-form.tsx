"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function InvestmentForm({ investorId }: { investorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    principalAmount: "",
    interestRate: "",
    tenureMonths: "",
    investmentDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/investors/${investorId}/investments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId,
          principalAmount: Number(form.principalAmount),
          interestRate: Number(form.interestRate),
          tenureMonths: Number(form.tenureMonths),
          investmentDate: form.investmentDate,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add investment");
        return;
      }
      toast.success("Investment added");
      setForm({ principalAmount: "", interestRate: "", tenureMonths: "", investmentDate: new Date().toISOString().slice(0, 10), notes: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-4">
      <div className="space-y-2">
        <Label>Principal Amount *</Label>
        <Input type="number" required min={1} value={form.principalAmount} onChange={(e) => set("principalAmount", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Interest Rate (% p.a.) *</Label>
        <Input type="number" required min={0} max={100} step="0.01" value={form.interestRate} onChange={(e) => set("interestRate", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Tenure (months) *</Label>
        <Input type="number" required min={1} value={form.tenureMonths} onChange={(e) => set("tenureMonths", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Investment Date *</Label>
        <Input type="date" required value={form.investmentDate} onChange={(e) => set("investmentDate", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-3">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Investment"}
        </Button>
      </div>
    </form>
  );
}
