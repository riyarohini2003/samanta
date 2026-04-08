import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONE: Record<
  Tone,
  {
    card: string;
    tile: string;
    accent: string;
    ring: string;
  }
> = {
  default: {
    card: "",
    tile: "bg-primary/10 text-primary dark:bg-primary/15",
    accent: "from-primary/5 to-transparent",
    ring: "ring-primary/10 dark:ring-primary/20",
  },
  success: {
    card: "",
    tile: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    accent: "from-emerald-500/5 to-transparent",
    ring: "ring-emerald-500/10 dark:ring-emerald-500/20",
  },
  warning: {
    card: "",
    tile: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    accent: "from-amber-500/5 to-transparent",
    ring: "ring-amber-500/10 dark:ring-amber-500/20",
  },
  danger: {
    card: "",
    tile: "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    accent: "from-red-500/5 to-transparent",
    ring: "ring-red-500/10 dark:ring-red-500/20",
  },
  info: {
    card: "",
    tile: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    accent: "from-sky-500/5 to-transparent",
    ring: "ring-sky-500/10 dark:ring-sky-500/20",
  },
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  href?: string;
}) {
  const t = TONE[tone];

  const card = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg hover:border-border",
        href && "cursor-pointer",
        t.card
      )}
    >
      {/* soft tint wash */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          t.accent
        )}
        aria-hidden
      />
      <CardContent className="relative flex items-start justify-between p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-bold tabular-nums tracking-tight">{value}</p>
          {hint && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-110",
              t.tile,
              t.ring
            )}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{card}</Link>;
  }

  return card;
}
