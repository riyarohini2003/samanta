import type { Role } from "@prisma/client";
import type { CurrentUser } from "./session";

/**
 * Returns a Prisma `where` fragment for data scoping based on the current user's role.
 * CEO (SUPER_ADMIN) / ADMIN  → no scoping (see everything)
 * BRANCH_MANAGER       → scoped to own branchId
 * EMPLOYEE             → scoped to own branchId (loan-level scoping adds assignedEmployeeId)
 */
export function scopeWhere(user: CurrentUser): Record<string, unknown> {
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return {};
  if (user.role === "BRANCH_MANAGER") {
    return user.branchId ? { branchId: user.branchId } : { id: "__none__" };
  }
  // EMPLOYEE
  return user.branchId ? { branchId: user.branchId } : { id: "__none__" };
}

/** Stricter scope for LoanAccount-like entities where EMPLOYEE only sees assigned rows. */
export function loanScopeWhere(user: CurrentUser): Record<string, unknown> {
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return {};
  if (user.role === "BRANCH_MANAGER") {
    return user.branchId ? { branchId: user.branchId } : { id: "__none__" };
  }
  return {
    branchId: user.branchId ?? "__none__",
    assignedEmployeeId: user.id,
  };
}

export function isAdmin(user: CurrentUser): boolean {
  return user.role === "SUPER_ADMIN" || user.role === "ADMIN";
}

export function canApproveLoans(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
