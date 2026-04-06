export function formatMoney(
  value: number | string | { toString(): string } | null | undefined,
  opts: { currency?: string; compact?: boolean } = {}
) {
  if (value == null) return "—";
  const n = typeof value === "number" ? value : Number(value.toString());
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: opts.currency ?? "INR",
    maximumFractionDigits: 2,
    notation: opts.compact ? "compact" : "standard",
  }).format(n);
}

export function formatNumber(value: number | string | null | undefined) {
  if (value == null) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function toNumber(value: unknown, fallback = 0) {
  if (value == null) return fallback;
  const n = Number(typeof value === "object" ? (value as any).toString() : value);
  return Number.isNaN(n) ? fallback : n;
}
