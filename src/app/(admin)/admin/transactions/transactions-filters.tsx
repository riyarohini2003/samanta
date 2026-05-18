"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, RotateCcw } from "lucide-react";

type Branch = { id: string; code: string; name: string };

function today() {
  return new Date().toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function firstOfLastMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function lastDayOfLastMonth() {
  const d = new Date();
  d.setDate(0); // last day of previous month
  return d.toISOString().split("T")[0];
}

const PRESETS: { label: string; from: () => string; to: () => string }[] = [
  { label: "Today", from: today, to: today },
  { label: "Last 7 days", from: () => daysAgo(6), to: today },
  { label: "Last 30 days", from: () => daysAgo(29), to: today },
  { label: "This month", from: firstOfMonth, to: today },
  { label: "Last month", from: firstOfLastMonth, to: lastDayOfLastMonth },
];

export function TransactionsFilters({
  branches,
  initial,
  canSelectBranch,
}: {
  branches: Branch[];
  initial: { from: string; to: string; branchId: string };
  canSelectBranch: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [from, setFrom] = React.useState(initial.from);
  const [to, setTo] = React.useState(initial.to);
  const [branchId, setBranchId] = React.useState(initial.branchId);

  function apply(next: { from?: string; to?: string; branchId?: string }) {
    const params = new URLSearchParams(sp.toString());
    const f = next.from ?? from;
    const t = next.to ?? to;
    const b = next.branchId ?? branchId;
    params.set("from", f);
    params.set("to", t);
    if (b) params.set("branchId", b);
    else params.delete("branchId");
    router.push(`${pathname}?${params.toString()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply({});
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    const f = p.from();
    const t = p.to();
    setFrom(f);
    setTo(t);
    apply({ from: f, to: t });
  }

  function reset() {
    const f = firstOfMonth();
    const t = today();
    setFrom(f);
    setTo(t);
    setBranchId("");
    const params = new URLSearchParams();
    params.set("from", f);
    params.set("to", t);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              min={from}
              max={today()}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {canSelectBranch && (
            <div className="w-56">
              <Label className="text-xs">Branch</Label>
              <Select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Button type="submit">
            <Calendar className="mr-2 h-4 w-4" />
            Apply
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => applyPreset(p)}
                className="text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
