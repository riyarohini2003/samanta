"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireRole, AuthError } from "@/server/auth/session";
import { writeAudit, getRequestMeta } from "@/server/audit";
import {
  DEFAULT_SETTINGS,
  getSetting,
  setSetting,
  type SettingKey,
} from "@/server/settings";

export type ActionState = { ok: boolean; message: string };

/**
 * Form checkboxes submit the string "true" when checked. We pair every checkbox
 * with a hidden `false` input so unchecked submits land as the string "false".
 * `z.coerce.boolean()` would treat "false" as truthy (non-empty string), so we
 * roll our own coercer that only accepts the expected truthy tokens.
 */
const boolish = z.preprocess(
  (v) => v === true || v === "true" || v === "on" || v === "1" || v === 1,
  z.boolean()
);

const currencies = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;

const organizationSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(120),
  legalName: z.string().max(160).optional().default(""),
  contactEmail: z.string().email("Invalid email").or(z.literal("")).default(""),
  contactPhone: z.string().max(32).optional().default(""),
  address: z.string().max(500).optional().default(""),
  currency: z.enum(currencies).default("INR"),
  website: z.string().max(200).optional().default(""),
  gstin: z.string().max(32).optional().default(""),
});

const loanPolicySchema = z.object({
  rateDaily: z.coerce.number().min(0).max(100),
  rateWeekly: z.coerce.number().min(0).max(100),
  rateMonthly: z.coerce.number().min(0).max(100),
  defaultProcessingFeePct: z.coerce.number().min(0).max(100),
  defaultPenaltyPerDay: z.coerce.number().min(0).max(100000),
  graceDays: z.coerce.number().int().min(0).max(365),
  minPrincipal: z.coerce.number().min(0),
  maxPrincipal: z.coerce.number().min(0),
  autoCloseOnFullPayment: boolish.default(false),
});

const securitySchema = z.object({
  passwordMinLength: z.coerce.number().int().min(6).max(64),
  requireUppercase: boolish.default(false),
  requireNumber: boolish.default(false),
  requireSymbol: boolish.default(false),
  forcePasswordChangeDays: z.coerce.number().int().min(0).max(3650),
  maxFailedLoginAttempts: z.coerce.number().int().min(0).max(100),
  sessionIdleTimeoutMinutes: z.coerce.number().int().min(1).max(1440),
  require2FAForAdmins: boolish.default(false),
});

const integrationsSchema = z.object({
  smsProvider: z.string().max(64).default(""),
  smsSenderId: z.string().max(32).default(""),
  smsApiKey: z.string().max(500).default(""),
  smsEnabled: boolish.default(false),
  waProvider: z.string().max(64).default(""),
  waPhoneNumberId: z.string().max(64).default(""),
  waApiKey: z.string().max(500).default(""),
  waEnabled: boolish.default(false),
  smtpHost: z.string().max(200).default(""),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().max(200).default(""),
  smtpPassword: z.string().max(500).default(""),
  smtpFromAddress: z.string().max(200).default(""),
  smtpEnabled: boolish.default(false),
});

const auditPolicySchema = z.object({
  retentionDays: z.coerce.number().int().min(7).max(36500),
  logReadActions: boolish.default(false),
  alertOnDestructiveAction: boolish.default(false),
});

function metaFromHeaders() {
  return getRequestMeta({ headers: headers() });
}

async function runUpdate<K extends SettingKey>(
  key: K,
  next: (typeof DEFAULT_SETTINGS)[K],
  label: string
): Promise<ActionState> {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");
    const before = await getSetting(key);
    await setSetting(key, next, me.id);
    await writeAudit({
      userId: me.id,
      action: "SETTINGS_UPDATED",
      entityType: "Setting",
      entityId: key,
      before,
      after: next,
      ...metaFromHeaders(),
    });
    revalidatePath("/admin/settings");
    return { ok: true, message: `${label} saved.` };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, message: "You don't have permission to change settings." };
    }
    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      return { ok: false, message: first ? `${first.path.join(".")}: ${first.message}` : "Validation failed" };
    }
    const msg = e instanceof Error ? e.message : "Failed to save settings";
    return { ok: false, message: msg };
  }
}

function toObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((v, k) => {
    out[k] = typeof v === "string" ? v : "";
  });
  return out;
}

export async function saveOrganizationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = organizationSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validation failed" };
  }
  return runUpdate("organization", parsed.data, "Organization profile");
}

export async function saveLoanPolicyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loanPolicySchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validation failed" };
  }
  if (parsed.data.minPrincipal > parsed.data.maxPrincipal) {
    return { ok: false, message: "Minimum principal cannot be greater than maximum" };
  }
  return runUpdate(
    "loanPolicy",
    {
      defaultInterestRates: {
        DAILY: parsed.data.rateDaily,
        WEEKLY: parsed.data.rateWeekly,
        MONTHLY: parsed.data.rateMonthly,
      },
      defaultProcessingFeePct: parsed.data.defaultProcessingFeePct,
      defaultPenaltyPerDay: parsed.data.defaultPenaltyPerDay,
      graceDays: parsed.data.graceDays,
      minPrincipal: parsed.data.minPrincipal,
      maxPrincipal: parsed.data.maxPrincipal,
      autoCloseOnFullPayment: parsed.data.autoCloseOnFullPayment,
    },
    "Loan policy"
  );
}

export async function saveSecurityAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = securitySchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validation failed" };
  }
  return runUpdate("security", parsed.data, "Security policy");
}

export async function saveIntegrationsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = integrationsSchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validation failed" };
  }
  // For secret fields, an empty submitted value means "keep the existing secret".
  // This prevents accidentally wiping credentials when someone only edits non-secret fields.
  const existing = await getSetting("integrations");
  return runUpdate(
    "integrations",
    {
      sms: {
        provider: parsed.data.smsProvider,
        senderId: parsed.data.smsSenderId,
        apiKey: parsed.data.smsApiKey || existing.sms.apiKey,
        enabled: parsed.data.smsEnabled,
      },
      whatsapp: {
        provider: parsed.data.waProvider,
        phoneNumberId: parsed.data.waPhoneNumberId,
        apiKey: parsed.data.waApiKey || existing.whatsapp.apiKey,
        enabled: parsed.data.waEnabled,
      },
      smtp: {
        host: parsed.data.smtpHost,
        port: parsed.data.smtpPort,
        user: parsed.data.smtpUser,
        password: parsed.data.smtpPassword || existing.smtp.password,
        fromAddress: parsed.data.smtpFromAddress,
        enabled: parsed.data.smtpEnabled,
      },
    },
    "Integrations"
  );
}

export async function saveAuditPolicyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = auditPolicySchema.safeParse(toObject(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validation failed" };
  }
  return runUpdate("auditPolicy", parsed.data, "Audit policy");
}
