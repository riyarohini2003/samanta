"use client";
import { useCallback, useMemo, useState } from "react";

/** Lightweight row-selection state for data tables. */
export function useRowSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
  }, [allIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isAllSelected = allIds.length > 0 && selected.size === allIds.length;
  const isSomeSelected = selected.size > 0 && selected.size < allIds.length;

  const ids = useMemo(() => Array.from(selected), [selected]);

  return { selected, ids, toggle, toggleAll, clear, isAllSelected, isSomeSelected, count: selected.size };
}
