import { z } from "zod";

// ─── Investor schemas ───────────────────────────────────────────────
export const investorCreateSchema = z.object({
  fullName: z.string().min(2),
  mobile: z.string().min(7),
  email: z.string().email().optional().nullable(),
  pan: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  ifsc: z.string().optional().nullable(),
});

export const investorUpdateSchema = investorCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type InvestorCreateInput = z.infer<typeof investorCreateSchema>;
export type InvestorUpdateInput = z.infer<typeof investorUpdateSchema>;

// ─── Investment schemas ─────────────────────────────────────────────
export const payoutModeSchema = z.enum(["MONTHLY_INTEREST", "MONTHLY_EMI", "CUSTOM"]);

/** A single row that the admin can supply when payoutMode = CUSTOM. */
export const customPayoutRowSchema = z.object({
  dueDate: z.string().or(z.date()),
  principalDue: z.number().min(0).default(0),
  interestDue: z.number().min(0).default(0),
});

export const investmentCreateSchema = z.object({
  investorId: z.string().min(1),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  tenureMonths: z.number().int().positive(),
  investmentDate: z.string().or(z.date()),
  payoutMode: payoutModeSchema.default("MONTHLY_INTEREST"),
  agreementDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
  /** Required only when payoutMode === "CUSTOM"; ignored otherwise. */
  customPayouts: z.array(customPayoutRowSchema).optional(),
});

export const investmentUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "MATURED", "WITHDRAWN"]).optional(),
  paidAmount: z.number().min(0).optional(),
  agreementDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const payoutPaySchema = z.object({
  paidAmount: z.number().positive(),
  paidAt: z.string().or(z.date()).optional(),
  paymentMode: z.enum(["CASH", "UPI", "BANK", "CHEQUE"]).default("CASH"),
  reference: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const payoutUpdateSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PARTIAL", "SKIPPED"]).optional(),
  note: z.string().optional().nullable(),
});

export type InvestmentCreateInput = z.infer<typeof investmentCreateSchema>;
export type InvestmentUpdateInput = z.infer<typeof investmentUpdateSchema>;
export type CustomPayoutRow = z.infer<typeof customPayoutRowSchema>;
export type PayoutPayInput = z.infer<typeof payoutPaySchema>;
