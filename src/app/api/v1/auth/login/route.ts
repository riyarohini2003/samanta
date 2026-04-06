import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { loginSchema } from "@/lib/zod-schemas/auth";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { ok, handleError, unauthorized } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";
import { loginLimiter, getClientIp } from "@/server/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = loginLimiter(clientIp);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const body = loginSchema.parse(await req.json());
    const meta = getRequestMeta(req);

    const user = await prisma.user.findUnique({
      where: { loginId: body.loginId },
    });

    if (!user || !user.isActive || user.deletedAt) {
      await writeAudit({
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: body.loginId,
        after: { reason: "invalid_credentials" },
        ...meta,
      });
      return unauthorized("Invalid credentials");
    }

    const okPw = await verifyPassword(body.password, user.passwordHash);
    if (!okPw) {
      await writeAudit({
        userId: user.id,
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: user.id,
        after: { reason: "wrong_password" },
        ...meta,
      });
      return unauthorized("Invalid credentials");
    }

    await createSession(user, {
      ip: meta.ip ?? undefined,
      userAgent: meta.userAgent ?? undefined,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await writeAudit({
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      ...meta,
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        loginId: user.loginId,
        role: user.role,
        branchId: user.branchId,
      },
      redirect: user.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
    });
  } catch (e) {
    return handleError(e);
  }
}
