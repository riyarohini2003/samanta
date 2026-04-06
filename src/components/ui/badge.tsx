import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === "PENDING" ? "chip-pending"
    : s === "APPROVED" || s === "PAID" ? "chip-approved"
    : s === "REJECTED" || s === "MISSED" ? "chip-rejected"
    : s === "ACTIVE" ? "chip-active"
    : s === "CLOSED" ? "chip-closed"
    : s === "OVERDUE" || s === "NPA" ? "chip-overdue"
    : s === "PARTIAL" ? "chip-partial"
    : s === "DUE" || s === "DUE_TODAY" ? "chip-due"
    : s === "DAILY" ? "chip-daily"
    : s === "WEEKLY" ? "chip-weekly"
    : s === "MONTHLY" ? "chip-monthly"
    : "chip-closed";
  return <Badge className={cls}>{s}</Badge>;
}
