import { z } from "zod";

export const dueListQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  branchId: z.string().optional(),
  employeeId: z.string().optional(),
  loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  status: z.enum(["ALL", "PENDING", "PAID", "PARTIAL", "MISSED"]).optional().default("ALL"),
  q: z.string().optional(),
  mode: z.enum(["DUE_ON", "DUE_UPTO", "DUE_BETWEEN"]).optional().default("DUE_ON"),
});

export const paymentCreateSchema = z.object({
  loanAccountId: z.string().min(1),
  scheduleId: z.string().optional(),
  amount: z.coerce.number().positive(),
  penalty: z.coerce.number().nonnegative().default(0),
  mode: z.enum(["CASH", "UPI", "BANK", "CHEQUE"]),
  note: z.string().optional(),
  geoLat: z.coerce.number().optional(),
  geoLng: z.coerce.number().optional(),
  clientRef: z.string().optional(),
});

export const paymentUpdateSchema = z.object({
  amount: z.coerce.number().positive(),
  penalty: z.coerce.number().nonnegative().default(0),
  mode: z.enum(["CASH", "UPI", "BANK", "CHEQUE"]),
  note: z.string().optional().nullable(),
  collectedAt: z.string().datetime().optional(),
});

export type DueListQuery = z.infer<typeof dueListQuerySchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;
