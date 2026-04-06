import { z } from "zod";

export const loginSchema = z.object({
  loginId: z.string().min(2, "Login ID is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Min 6 characters"),
});
