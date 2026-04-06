"use client";
import { toast } from "sonner";

export interface BulkDeleteResult {
  deleted: number;
  skipped: { id: string; reason: string }[];
}

/**
 * Issue parallel DELETE requests against `${baseUrl}/${id}`.
 * Returns a summary; surfaces a toast.
 */
export async function runBulkDelete(baseUrl: string, ids: string[]): Promise<BulkDeleteResult> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
        if (res.ok) return { id, ok: true as const };
        const body = await res.json().catch(() => ({}));
        return { id, ok: false as const, reason: body?.error || `HTTP ${res.status}` };
      } catch (e) {
        return { id, ok: false as const, reason: (e as Error).message };
      }
    })
  );

  const deleted = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => !r.ok).map((r) => ({ id: r.id, reason: (r as { reason: string }).reason }));

  if (deleted > 0 && skipped.length === 0) {
    toast.success(`${deleted} deleted`);
  } else if (deleted > 0 && skipped.length > 0) {
    toast.warning(`${deleted} deleted · ${skipped.length} skipped`, {
      description: Array.from(new Set(skipped.map((s) => s.reason))).slice(0, 3).join(" · "),
    });
  } else if (deleted === 0 && skipped.length > 0) {
    toast.error(`Nothing deleted — ${skipped.length} blocked`, {
      description: Array.from(new Set(skipped.map((s) => s.reason))).slice(0, 3).join(" · "),
    });
  }

  return { deleted, skipped };
}
