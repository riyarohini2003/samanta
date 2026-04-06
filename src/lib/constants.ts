export const APP_NAME = "Samanta LMS";

export const COOKIE_NAMES = {
  access: "samanta_at",
  refresh: "samanta_rt",
} as const;

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;
export const MANAGEMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER"] as const;

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  BRANCH_MANAGER: "Branch Manager",
  EMPLOYEE: "Employee",
};

export function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role.replace("_", " ");
}

export const LOAN_TYPES = ["DAILY", "WEEKLY", "MONTHLY"] as const;

export const PAYMENT_MODES = ["CASH", "UPI", "BANK", "CHEQUE"] as const;

export const DEFAULT_PAGE_SIZE = 20;
