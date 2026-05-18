import { NextRequest } from "next/server";
import { requireRole, AuthError } from "@/server/auth/session";
import {
  getAllSettings,
  getSetting,
  setSetting,
  maskIntegrations,
  type SettingKey,
} from "@/server/settings";
import { ok, badRequest, handleError, unauthorized, forbidden } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export const dynamic = "force-dynamic";

const VALID_KEYS = new Set<SettingKey>([
  "organization",
  "loanPolicy",
  "security",
  "integrations",
  "auditPolicy",
]);

export async function GET(req: NextRequest) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN");
    const sp = req.nextUrl.searchParams;
    const key = sp.get("key") as SettingKey | null;

    if (key) {
      if (!VALID_KEYS.has(key)) return badRequest("Invalid settings key");
      const value =
        key === "integrations"
          ? maskIntegrations(await getSetting("integrations"))
          : await getSetting(key);
      return ok({ key, value });
    }

    const all = await getAllSettings();
    return ok({
      ...all,
      integrations: maskIntegrations(all.integrations),
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = (await req.json()) as { key?: string; value?: unknown };
    if (!body.key || !VALID_KEYS.has(body.key as SettingKey)) {
      return badRequest("Invalid settings key");
    }
    if (!body.value || typeof body.value !== "object") {
      return badRequest("Missing 'value' object");
    }

    const key = body.key as SettingKey;
    const before = await getSetting(key);
    await setSetting(
      key,
      body.value as never,
      me.id,
    );
    const after = await getSetting(key);

    const meta = getRequestMeta(req);
    await writeAudit({
      userId: me.id,
      action: "SETTINGS_UPDATED",
      entityType: "Setting",
      entityId: key,
      before,
      after,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ key, value: after });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
