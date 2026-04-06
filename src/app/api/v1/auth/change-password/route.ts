import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { changePasswordSchema } from "@/lib/zod-schemas/auth";
import { passwordResetLimiter, getClientIp } from "@/server/rate-limit";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = passwordResetLimiter(ip);
    if (!rl.success) {
      return badRequest("Too many attempts. Try again later.");
    }

    const me = await requireUser();
    const body = changePasswordSchema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { passwordHash: true },
    });
    if (!user) return unauthorized();

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) return badRequest("Current password is incorrect");

    const newHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: newHash },
    });

    await writeAudit({
      userId: me.id,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: me.id,
      ...getRequestMeta(req),
    });

    return ok({ message: "Password changed successfully" });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
