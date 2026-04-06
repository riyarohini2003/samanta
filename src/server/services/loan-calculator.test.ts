import { describe, it, expect } from "vitest";
import { calculateLoan } from "./loan-calculator";

describe("calculateLoan", () => {
  it("calculates simple interest daily loan correctly", () => {
    const result = calculateLoan({
      principal: 10000,
      interestRate: 12,
      tenureCount: 30,
      loanType: "DAILY",
      startDate: "2025-01-01",
    });
    expect(result.principal).toBe(10000);
    expect(result.interestAmount).toBeGreaterThan(0);
    // totalPayable is Math.round(principal + interest)
    expect(result.totalPayable).toBe(Math.round(result.principal + result.interestAmount));
    expect(result.installmentAmount).toBe(Math.round(result.totalPayable / 30));
    expect(result.loanType).toBe("DAILY");
    expect(result.interestMethod).toBe("SIMPLE");
    expect(result.ratePeriod).toBe("ANNUAL");
  });

  it("calculates simple interest monthly loan correctly", () => {
    const result = calculateLoan({
      principal: 100000,
      interestRate: 24,
      tenureCount: 12,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
    });
    expect(result.principal).toBe(100000);
    // Simple interest: P * r * t = 100000 * 0.24 * 1 = 24000
    expect(result.interestAmount).toBe(24000);
    expect(result.totalPayable).toBe(124000);
    expect(result.installmentAmount).toBe(Math.round(124000 / 12));
  });

  it("calculates compound interest correctly", () => {
    const result = calculateLoan({
      principal: 100000,
      interestRate: 12,
      tenureCount: 12,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
      interestMethod: "COMPOUND",
    });
    expect(result.principal).toBe(100000);
    expect(result.interestAmount).toBeGreaterThan(0);
    // Compound should be higher than simple for same rate
    const simple = calculateLoan({
      principal: 100000,
      interestRate: 12,
      tenureCount: 12,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
      interestMethod: "SIMPLE",
    });
    expect(result.interestAmount).toBeGreaterThan(simple.interestAmount);
  });

  it("handles weekly rate period correctly", () => {
    const result = calculateLoan({
      principal: 10000,
      interestRate: 1,
      tenureCount: 4,
      loanType: "WEEKLY",
      startDate: "2025-01-01",
      ratePeriod: "WEEKLY",
    });
    // Weekly rate 1% -> annual = 52%
    expect(result.effectiveAnnualRate).toBe(52);
  });

  it("handles monthly rate period correctly", () => {
    const result = calculateLoan({
      principal: 10000,
      interestRate: 2,
      tenureCount: 6,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
      ratePeriod: "MONTHLY",
    });
    // Monthly rate 2% -> annual = 24%
    expect(result.effectiveAnnualRate).toBe(24);
  });

  it("calculates processing fee separately", () => {
    const result = calculateLoan({
      principal: 50000,
      interestRate: 12,
      tenureCount: 10,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
      processingFee: 500,
    });
    expect(result.processingFee).toBe(500);
    // Processing fee should NOT affect totalPayable
    expect(result.totalPayable).toBe(result.principal + result.interestAmount);
  });

  it("returns correct maturity date for daily loans", () => {
    const result = calculateLoan({
      principal: 10000,
      interestRate: 12,
      tenureCount: 30,
      loanType: "DAILY",
      startDate: "2025-01-01",
    });
    // startDate + (tenureCount - 1) days = Jan 1 + 29 days
    const start = new Date(result.startDate);
    const maturity = new Date(result.maturityDate);
    const diffDays = Math.round((maturity.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(29);
  });

  it("returns correct maturity date for monthly loans", () => {
    const result = calculateLoan({
      principal: 10000,
      interestRate: 12,
      tenureCount: 6,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
    });
    // startDate + (tenureCount - 1) months = 5 months after start
    const diffMs = result.maturityDate.getTime() - result.startDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    // 5 months from Jan 1 ~ 150-153 days (Jan 31 + Feb 28 + Mar 31 + Apr 30 + May 31 = 151)
    expect(diffDays).toBeGreaterThanOrEqual(148);
    expect(diffDays).toBeLessThanOrEqual(155);
  });

  it("handles zero interest rate", () => {
    const result = calculateLoan({
      principal: 10000,
      interestRate: 0,
      tenureCount: 10,
      loanType: "MONTHLY",
      startDate: "2025-01-01",
    });
    expect(result.interestAmount).toBe(0);
    expect(result.totalPayable).toBe(10000);
    expect(result.installmentAmount).toBe(1000);
  });
});
