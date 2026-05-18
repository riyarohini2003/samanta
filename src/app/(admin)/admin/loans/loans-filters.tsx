"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export type FilterOption = { value: string; label: string };

export type LoansFiltersProps = {
  statuses: string[];
  types: string[];
  branchIds: string[];
  officerIds: string[];
  options: {
    statuses: FilterOption[];
    types: FilterOption[];
    branches: FilterOption[];
    officers: FilterOption[];
  };
};

/* ────────────────────────────────────────────────────────────── helpers */

function parseCsv(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function writeParams(
  current: URLSearchParams,
  patch: Record<string, string[] | null>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, val] of Object.entries(patch)) {
    if (!val || val.length === 0) next.delete(key);
    else next.set(key, val.join(","));
  }
  return next;
}

/* ────────────────────────────────────────────────────────── chip toggle */

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {active && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────── multi-select pop */

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  emptyText = "All",
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
}) {
  const count = selected.length;
  const triggerLabel =
    count === 0
      ? `+ ${label}`
      : count === 1
        ? options.find((o) => o.value === selected[0])?.label ?? `${label} (1)`
        : `${label} (${count})`;

  if (options.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            count > 0
              ? "border-primary/60 bg-primary/10 text-foreground hover:bg-primary/20"
              : "border-dashed border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {triggerLabel}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-56 overflow-y-auto"
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          options.map((opt) => {
            const isOn = selected.includes(opt.value);
            return (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={isOn}
                onCheckedChange={() => {
                  const next = isOn
                    ? selected.filter((v) => v !== opt.value)
                    : [...selected, opt.value];
                  onChange(next);
                }}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="truncate">{opt.label}</span>
              </DropdownMenuCheckboxItem>
            );
          })
        )}
        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Clear selection
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────────────────────────────────────────────── main component */

export default function LoansFilters({
  statuses,
  types,
  branchIds,
  officerIds,
  options,
}: LoansFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const apply = React.useCallback(
    (patch: Record<string, string[] | null>) => {
      const next = writeParams(sp, patch);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, sp],
  );

  function toggleIn(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  const labelFor = (opts: FilterOption[], v: string) =>
    opts.find((o) => o.value === v)?.label ?? v;

  const activeChips: {
    key: string;
    label: string;
    onRemove: () => void;
  }[] = [
    ...statuses.map((v) => ({
      key: `status:${v}`,
      label: labelFor(options.statuses, v),
      onRemove: () =>
        apply({ status: statuses.filter((s) => s !== v) }),
    })),
    ...types.map((v) => ({
      key: `type:${v}`,
      label: labelFor(options.types, v),
      onRemove: () =>
        apply({ type: types.filter((s) => s !== v) }),
    })),
    ...branchIds.map((v) => ({
      key: `branch:${v}`,
      label: labelFor(options.branches, v),
      onRemove: () =>
        apply({ branch: branchIds.filter((s) => s !== v) }),
    })),
    ...officerIds.map((v) => ({
      key: `officer:${v}`,
      label: labelFor(options.officers, v),
      onRemove: () =>
        apply({ officer: officerIds.filter((s) => s !== v) }),
    })),
  ];

  const anyActive = activeChips.length > 0;

  function clearAll() {
    apply({ status: null, type: null, branch: null, officer: null });
  }

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <div className="flex flex-wrap gap-1.5">
            {options.statuses.map((o) => (
              <Chip
                key={o.value}
                active={statuses.includes(o.value)}
                onClick={() =>
                  apply({ status: toggleIn(statuses, o.value) })
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </span>
          <div className="flex flex-wrap gap-1.5">
            {options.types.map((o) => (
              <Chip
                key={o.value}
                active={types.includes(o.value)}
                onClick={() => apply({ type: toggleIn(types, o.value) })}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MultiSelect
            label="Branch"
            options={options.branches}
            selected={branchIds}
            onChange={(next) => apply({ branch: next })}
          />
          <MultiSelect
            label="Officer"
            options={options.officers}
            selected={officerIds}
            onChange={(next) => apply({ officer: next })}
          />
        </div>
      </div>

      {anyActive && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground">
            Active filters:
          </span>
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onRemove}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground hover:bg-accent/70"
            >
              {c.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
