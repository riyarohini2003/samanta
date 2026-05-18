import { Badge } from "./badge";
import { cn } from "@/lib/utils";

/**
 * Returns "IGL{serial}" for the 2nd loan onwards, else null.
 * `serial` is the loan's chronological order within a customer's loans
 * (1st loan = 1, 2nd loan = 2, …). Repeat-customer tag starts at 2.
 */
export function iglLabel(serial: number | null | undefined): string | null {
  const n = Number(serial ?? 0);
  if (!Number.isFinite(n) || n < 2) return null;
  return `IGL${n}`;
}

export function IglBadge({
  serial,
  className,
  title,
}: {
  serial: number | null | undefined;
  className?: string;
  title?: string;
}) {
  const label = iglLabel(serial);
  if (!label) return null;
  return (
    <Badge
      title={title ?? `Repeat loan #${serial} for this customer`}
      className={cn(
        "border-amber-300/60 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300",
        className
      )}
    >
      {label}
    </Badge>
  );
}
