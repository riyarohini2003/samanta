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
export const investmentCreateSchema = z.object({
  investorId: z.string().min(1),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  tenureMonths: z.number().int().positive(),
  investmentDate: z.string().or(z.date()),
  notes: z.string().optional().nullable(),
});

export const investmentUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "MATURED", "WITHDRAWN"]).optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export type InvestmentCreateInput = z.infer<typeof investmentCreateSchema>;
export type InvestmentUpdateInput = z.infer<typeof investmentUpdateSchema>;
