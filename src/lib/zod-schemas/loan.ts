import { z } from "zod";
import { customerCreateSchema, uploadedDocSchema } from "./customer";

export const loanCalcSchema = z.object({
  principal: z.coerce.number().positive(),
  interestRate: z.coerce.number().nonnegative(),
  tenureCount: z.coerce.number().int().positive(),
  loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  processingFee: z.coerce.number().nonnegative().default(0),
  startDate: z.string(),
  interestMethod: z.enum(["SIMPLE", "COMPOUND"]).default("SIMPLE"),
  ratePeriod: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).default("ANNUAL"),
});

export const loanApplicationCreateSchema = z.object({
  customerId: z.string().min(1),
  loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  principal: z.coerce.number().positive(),
  interestRate: z.coerce.number().nonnegative(),
  processingFee: z.coerce.number().nonnegative().default(0),
  tenureCount: z.coerce.number().int().positive(),
  startDate: z.string(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  interestMethod: z.enum(["SIMPLE", "COMPOUND"]).default("SIMPLE"),
  ratePeriod: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).default("ANNUAL"),
  documents: z.array(uploadedDocSchema).optional(),
  asDraft: z.boolean().optional(),
});

/** Combined intake: create a new customer AND their first loan application in one call. */
export const loanIntakeSchema = z.object({
  customer: customerCreateSchema,
  loan: z.object({
    loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    principal: z.coerce.number().positive(),
    interestRate: z.coerce.number().nonnegative(),
    processingFee: z.coerce.number().nonnegative().default(0),
    tenureCount: z.coerce.number().int().positive(),
    installmentAmount: z.coerce.number().nonnegative().optional(),
    startDate: z.string(),
    purpose: z.string().optional(),
    notes: z.string().optional(),
    interestMethod: z.enum(["SIMPLE", "COMPOUND"]).default("SIMPLE"),
    ratePeriod: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).default("ANNUAL"),
    documents: z.array(uploadedDocSchema).optional(),
    asDraft: z.boolean().optional(),
    /** Self-calculate mode: bypass server calculation, use provided values */
    selfCalculate: z.boolean().optional(),
    interestAmount: z.coerce.number().nonnegative().optional(),
    totalPayable: z.coerce.number().nonnegative().optional(),
  }),
});

/** Update an intake draft: customer fields + loan fields together. */
export const loanIntakeUpdateSchema = z.object({
  customer: customerCreateSchema.partial(),
  loan: z.object({
    loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    principal: z.coerce.number().positive().optional(),
    interestRate: z.coerce.number().nonnegative().optional(),
    processingFee: z.coerce.number().nonnegative().optional(),
    tenureCount: z.coerce.number().int().positive().optional(),
    installmentAmount: z.coerce.number().nonnegative().optional(),
    startDate: z.string().optional(),
    purpose: z.string().optional(),
    notes: z.string().optional(),
    interestMethod: z.enum(["SIMPLE", "COMPOUND"]).optional(),
    ratePeriod: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).optional(),
    documents: z.array(uploadedDocSchema).optional(),
    asDraft: z.boolean().optional(),
    selfCalculate: z.boolean().optional(),
    interestAmount: z.coerce.number().nonnegative().optional(),
    totalPayable: z.coerce.number().nonnegative().optional(),
  }),
});

export const loanApplicationUpdateSchema = z.object({
  loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  principal: z.coerce.number().positive().optional(),
  interestRate: z.coerce.number().nonnegative().optional(),
  processingFee: z.coerce.number().nonnegative().optional(),
  tenureCount: z.coerce.number().int().positive().optional(),
  startDate: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  interestMethod: z.enum(["SIMPLE", "COMPOUND"]).optional(),
  ratePeriod: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).optional(),
});

export const loanApproveSchema = z.object({
  remark: z.string().optional(),
});

export const loanRejectSchema = z.object({
  remark: z.string().min(2, "Rejection reason is required"),
});

export const loanDisburseSchema = z.object({
  disbursementMode: z.enum(["CASH", "BANK", "UPI", "CHEQUE"]),
  disbursedAt: z.string().optional(),
  assignedEmployeeId: z.string().min(1),
});

export const loanCloseSchema = z.object({
  type: z.enum(["close", "preclose"]).default("close"),
  waiverAmount: z.coerce.number().nonnegative().optional(),
});

export type LoanCalcInput = z.infer<typeof loanCalcSchema>;
export type LoanApplicationCreateInput = z.infer<typeof loanApplicationCreateSchema>;
