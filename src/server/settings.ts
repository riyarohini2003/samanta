import { prisma } from "./db";

/**
 * App-wide settings live in the `Setting` collection, keyed by section name.
 * Each section has a strongly typed shape + sensible defaults, so reading a setting
 * that hasn't been saved yet still gives you a usable value.
 *
 * Sensitive values (API keys, SMTP passwords) are stored as-is but should never
 * be echoed back to the browser in plaintext — see `maskIntegrations` below.
 */

export type OrganizationSettings = {
  companyName: string;
  legalName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currency: string;
  website: string;
  gstin: string;
};

export type LoanPolicySettings = {
  /** Interest rates are in percent. Daily is per day, Weekly is per week, Monthly is per month. */
  defaultInterestRates: { DAILY: number; WEEKLY: number; MONTHLY: number };
  defaultProcessingFeePct: number;
  defaultPenaltyPerDay: number;
  graceDays: number;
  minPrincipal: number;
  maxPrincipal: number;
  autoCloseOnFullPayment: boolean;
};

export type SecurityPolicy = {
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  forcePasswordChangeDays: number;
  maxFailedLoginAttempts: number;
  sessionIdleTimeoutMinutes: number;
  require2FAForAdmins: boolean;
};

export type IntegrationSettings = {
  sms: {
    provider: string;
    senderId: string;
    apiKey: string;
    enabled: boolean;
  };
  whatsapp: {
    provider: string;
    phoneNumberId: string;
    apiKey: string;
    enabled: boolean;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromAddress: string;
    enabled: boolean;
  };
};

export type AuditPolicy = {
  retentionDays: number;
  logReadActions: boolean;
  alertOnDestructiveAction: boolean;
};

const KEYS = {
  organization: "organization",
  loanPolicy: "loanPolicy",
  security: "security",
  integrations: "integrations",
  auditPolicy: "auditPolicy",
} as const;

export type SettingKey = keyof typeof KEYS;

export const DEFAULT_SETTINGS: {
  organization: OrganizationSettings;
  loanPolicy: LoanPolicySettings;
  security: SecurityPolicy;
  integrations: IntegrationSettings;
  auditPolicy: AuditPolicy;
} = {
  organization: {
    companyName: "Samanta Finance",
    legalName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    currency: "INR",
    website: "",
    gstin: "",
  },
  loanPolicy: {
    defaultInterestRates: { DAILY: 0.2, WEEKLY: 1.5, MONTHLY: 3 },
    defaultProcessingFeePct: 2,
    defaultPenaltyPerDay: 50,
    graceDays: 3,
    minPrincipal: 1000,
    maxPrincipal: 500000,
    autoCloseOnFullPayment: true,
  },
  security: {
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: false,
    forcePasswordChangeDays: 90,
    maxFailedLoginAttempts: 5,
    sessionIdleTimeoutMinutes: 60,
    require2FAForAdmins: false,
  },
  integrations: {
    sms: { provider: "", senderId: "", apiKey: "", enabled: false },
    whatsapp: { provider: "", phoneNumberId: "", apiKey: "", enabled: false },
    smtp: { host: "", port: 587, user: "", password: "", fromAddress: "", enabled: false },
  },
  auditPolicy: {
    retentionDays: 365,
    logReadActions: false,
    alertOnDestructiveAction: true,
  },
};

type SettingsMap = typeof DEFAULT_SETTINGS;

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const row = await prisma.setting.findUnique({ where: { key } });
  const defaults = DEFAULT_SETTINGS[key];
  if (!row) return defaults;
  // Shallow merge so defaults fill in any fields that were added after the value was saved.
  return { ...defaults, ...((row.value as object) ?? {}) } as SettingsMap[K];
}

export async function getAllSettings() {
  const [organization, loanPolicy, security, integrations, auditPolicy] = await Promise.all([
    getSetting("organization"),
    getSetting("loanPolicy"),
    getSetting("security"),
    getSetting("integrations"),
    getSetting("auditPolicy"),
  ]);
  return { organization, loanPolicy, security, integrations, auditPolicy };
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingsMap[K],
  updatedBy: string | null
) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as object, updatedBy: updatedBy ?? undefined },
    update: { value: value as object, updatedBy: updatedBy ?? undefined },
  });
}

/**
 * Returns a copy of integrations where sensitive credentials are replaced with a
 * masked placeholder. Safe to send to the browser.
 */
export function maskIntegrations(value: IntegrationSettings): IntegrationSettings & {
  _masked: { smsApiKey: boolean; whatsappApiKey: boolean; smtpPassword: boolean };
} {
  const mask = (s: string) => (s ? "••••••••" : "");
  return {
    ...value,
    sms: { ...value.sms, apiKey: mask(value.sms.apiKey) },
    whatsapp: { ...value.whatsapp, apiKey: mask(value.whatsapp.apiKey) },
    smtp: { ...value.smtp, password: mask(value.smtp.password) },
    _masked: {
      smsApiKey: Boolean(value.sms.apiKey),
      whatsappApiKey: Boolean(value.whatsapp.apiKey),
      smtpPassword: Boolean(value.smtp.password),
    },
  };
}
