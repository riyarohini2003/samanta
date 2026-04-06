import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { resetPasswordSchema } from "@/lib/zod-schemas/employee";
import { hashPassword } from "@/server/auth/password";
import { ok, handleError, unauthorized, forbidden, notFound } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";
import { passwordResetLimiter, getClientIp } from "@/server/rate-limit";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rl = passwordResetLimiter(getClientIp(req));
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const me = await requireRole("SUPER_ADMIN", "ADMIN");

    // Prevent resetting a higher-privilege user's password
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, branchId: true },
    });
    if (!target) return notFound("Employee not found");
    if (target.role === "SUPER_ADMIN" && me.role !== "SUPER_ADMIN") {
      return forbidden("Only the CEO can reset another Super Admin's password");
    }
    if (me.role === "ADMIN" && target.role === "ADMIN" && me.id !== target.id) {
      return forbidden("Admins cannot reset other admin passwords");
    }

    const { newPassword } = resetPasswordSchema.parse(await req.json());
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({ where: { id: params.id }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId: params.id } });

    await writeAudit({
      userId: me.id,
      action: "EMPLOYEE_PASSWORD_RESET",
      entityType: "User",
      entityId: params.id,
      ...getRequestMeta(req),
    });

    return ok({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
