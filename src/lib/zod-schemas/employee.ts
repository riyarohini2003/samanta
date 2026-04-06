import { z } from "zod";

export const employeeCreateSchema = z.object({
  name: z.string().min(2),
  loginId: z.string().min(3)
    .regex(/^[a-zA-Z0-9._+\-]+$/, "Only letters, numbers, . _ + -")
    .refine(v => !/^\d+$/.test(v), "Plain numbers are not allowed. Use +country code for phone (e.g. +919876543210) or a username (e.g. rahul.k)"),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  mobile: z.string().min(7),
  role: z.enum(["ADMIN", "BRANCH_MANAGER", "EMPLOYEE"]),
  branchId: z.string().min(1),
  address: z.string().optional(),
  joiningDate: z.string().optional(),
});

export const employeeUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  mobile: z.string().min(7).optional(),
  role: z.enum(["ADMIN", "BRANCH_MANAGER", "EMPLOYEE"]).optional(),
  branchId: z.string().optional(),
  address: z.string().optional(),
  joiningDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
