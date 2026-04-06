import { describe, it, expect } from "vitest";
import { scopeWhere, loanScopeWhere, isAdmin, canApproveLoans } from "./guards";
import type { CurrentUser } from "./session";

function makeUser(overrides: Partial<CurrentUser>): CurrentUser {
  return {
    id: "user1",
    name: "Test",
    loginId: "test",
    role: "EMPLOYEE",
    branchId: "branch1",
    employeeCode: "EMP001",
    email: null,
    mobile: "9999999999",
    photoUrl: null,
    ...overrides,
  };
}

describe("scopeWhere", () => {
  it("returns empty filter for SUPER_ADMIN", () => {
    expect(scopeWhere(makeUser({ role: "SUPER_ADMIN" }))).toEqual({});
  });

  it("returns empty filter for ADMIN", () => {
    expect(scopeWhere(makeUser({ role: "ADMIN" }))).toEqual({});
  });

  it("scopes BRANCH_MANAGER to their branch", () => {
    expect(scopeWhere(makeUser({ role: "BRANCH_MANAGER", branchId: "b1" }))).toEqual({
      branchId: "b1",
    });
  });

  it("scopes EMPLOYEE to their branch", () => {
    expect(scopeWhere(makeUser({ role: "EMPLOYEE", branchId: "b1" }))).toEqual({
      branchId: "b1",
    });
  });

  it("returns no-match if BRANCH_MANAGER has no branch", () => {
    expect(scopeWhere(makeUser({ role: "BRANCH_MANAGER", branchId: null }))).toEqual({
      id: "__none__",
    });
  });
});

describe("loanScopeWhere", () => {
  it("returns empty filter for admins", () => {
    expect(loanScopeWhere(makeUser({ role: "SUPER_ADMIN" }))).toEqual({});
  });

  it("scopes BRANCH_MANAGER to branch", () => {
    expect(loanScopeWhere(makeUser({ role: "BRANCH_MANAGER", branchId: "b1" }))).toEqual({
      branchId: "b1",
    });
  });

  it("scopes EMPLOYEE to branch AND assignedEmployeeId", () => {
    expect(loanScopeWhere(makeUser({ role: "EMPLOYEE", id: "u1", branchId: "b1" }))).toEqual({
      branchId: "b1",
      assignedEmployeeId: "u1",
    });
  });
});

describe("isAdmin", () => {
  it("returns true for SUPER_ADMIN", () => {
    expect(isAdmin(makeUser({ role: "SUPER_ADMIN" }))).toBe(true);
  });
  it("returns true for ADMIN", () => {
    expect(isAdmin(makeUser({ role: "ADMIN" }))).toBe(true);
  });
  it("returns false for EMPLOYEE", () => {
    expect(isAdmin(makeUser({ role: "EMPLOYEE" }))).toBe(false);
  });
  it("returns false for BRANCH_MANAGER", () => {
    expect(isAdmin(makeUser({ role: "BRANCH_MANAGER" }))).toBe(false);
  });
});

describe("canApproveLoans", () => {
  it("allows SUPER_ADMIN", () => {
    expect(canApproveLoans("SUPER_ADMIN")).toBe(true);
  });
  it("allows ADMIN", () => {
    expect(canApproveLoans("ADMIN")).toBe(true);
  });
  it("denies EMPLOYEE", () => {
    expect(canApproveLoans("EMPLOYEE")).toBe(false);
  });
  it("denies BRANCH_MANAGER", () => {
    expect(canApproveLoans("BRANCH_MANAGER")).toBe(false);
  });
});
