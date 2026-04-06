import { z } from "zod";

export const branchCreateSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{4,6}$/, "Invalid pincode"),
  contactNumber: z.string().min(7),
  managerId: z.string().optional().nullable(),
});

export const branchUpdateSchema = branchCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type BranchCreateInput = z.infer<typeof branchCreateSchema>;
export type BranchUpdateInput = z.infer<typeof branchUpdateSchema>;
