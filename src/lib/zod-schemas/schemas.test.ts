import { describe, it, expect } from "vitest";
import { loginSchema, changePasswordSchema } from "./auth";
import { customerCreateSchema } from "./customer";
import { loanCalcSchema } from "./loan";
import { employeeCreateSchema, resetPasswordSchema } from "./employee";

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ loginId: "admin", password: "pass123" });
    expect(result.success).toBe(true);
  });

  it("rejects short loginId", () => {
    const result = loginSchema.safeParse({ loginId: "a", password: "pass123" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ loginId: "admin", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("customerCreateSchema", () => {
  const validCustomer = {
    fullName: "John Doe",
    mobile: "9876543210",
    currentAddress: "123 Main St",
    branchId: "branch123",
  };

  it("accepts valid customer", () => {
    const result = customerCreateSchema.safeParse(validCustomer);
    expect(result.success).toBe(true);
  });

  it("validates aadhaar format (12 digits)", () => {
    const result = customerCreateSchema.safeParse({ ...validCustomer, aadhaar: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts valid aadhaar", () => {
    const result = customerCreateSchema.safeParse({ ...validCustomer, aadhaar: "123456789012" });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = customerCreateSchema.safeParse({ fullName: "Test" });
    expect(result.success).toBe(false);
  });
});

describe("loanCalcSchema", () => {
  it("accepts valid loan calc input", () => {
    const result = loanCalcSchema.safeParse({
      principal: 10000,
      interestRate: 12,
      tenureCount: 12,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative principal", () => {
    const result = loanCalcSchema.safeParse({
      principal: -100,
      interestRate: 12,
      tenureCount: 12,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid loan type", () => {
    const result = loanCalcSchema.safeParse({
      principal: 10000,
      interestRate: 12,
      tenureCount: 12,
      loanType: "YEARLY",
      startDate: "2025-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers", () => {
    const result = loanCalcSchema.safeParse({
      principal: "10000",
      interestRate: "12",
      tenureCount: "12",
      loanType: "MONTHLY",
      startDate: "2025-01-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.principal).toBe(10000);
    }
  });
});

describe("employeeCreateSchema", () => {
  it("accepts valid employee", () => {
    const result = employeeCreateSchema.safeParse({
      name: "Jane",
      loginId: "jane.doe",
      password: "secret123",
      mobile: "9876543210",
      role: "EMPLOYEE",
      branchId: "branch1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = employeeCreateSchema.safeParse({
      name: "Jane",
      loginId: "jane",
      password: "12345",
      mobile: "9876543210",
      role: "EMPLOYEE",
      branchId: "branch1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid loginId characters", () => {
    const result = employeeCreateSchema.safeParse({
      name: "Jane",
      loginId: "jane@doe",
      password: "secret123",
      mobile: "9876543210",
      role: "EMPLOYEE",
      branchId: "branch1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects plain numeric loginId (10-digit number)", () => {
    const result = employeeCreateSchema.safeParse({
      name: "Jane",
      loginId: "9876543210",
      password: "secret123",
      mobile: "9876543210",
      role: "EMPLOYEE",
      branchId: "branch1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts phone number loginId with + prefix", () => {
    const result = employeeCreateSchema.safeParse({
      name: "Jane",
      loginId: "+919876543210",
      password: "secret123",
      mobile: "9876543210",
      role: "EMPLOYEE",
      branchId: "branch1",
    });
    expect(result.success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid password", () => {
    const result = resetPasswordSchema.safeParse({ newPassword: "newpass123" });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = resetPasswordSchema.safeParse({ newPassword: "123" });
    expect(result.success).toBe(false);
  });
});
