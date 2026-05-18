import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { loginSchema } from "@/lib/zod-schemas/auth";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { ok, handleError, unauthorized } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";
import { loginLimiter, getClientIp } from "@/server/rate-limit";

/**
 * Mobile-friendly login: returns access + refresh tokens in the JSON body
 * instead of setting httpOnly cookies. Used by the Capacitor app, which
 * stores tokens in @capacitor/preferences and sends them as Bearer headers.
 */
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

    // Exact match first, then +91 prefix for bare 10-digit phones. Plain
    // `equals` avoids the MongoDB regex path that crashes on values containing
    // regex specials like the leading `+`.
    let user = await prisma.user.findFirst({
      where: { loginId: body.loginId },
    });
    if (!user && /^\d{10}$/.test(body.loginId)) {
      user = await prisma.user.findFirst({
        where: { loginId: `+91${body.loginId}` },
      });
    }
    if (!user && /^[a-zA-Z0-9._\-]+$/.test(body.loginId)) {
      user = await prisma.user.findFirst({
        where: { loginId: { equals: body.loginId, mode: "insensitive" } },
      });
    }
    if (!user && /^\d{10}$/.test(body.loginId)) {
      user = await prisma.user.findFirst({
        where: { OR: [{ mobile: body.loginId }, { mobile: `+91${body.loginId}` }] },
      });
    }

    if (!user || !user.isActive || user.deletedAt) {
      await writeAudit({
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: body.loginId,
        after: { reason: "invalid_credentials", channel: "mobile" },
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
        after: { reason: "wrong_password", channel: "mobile" },
        ...meta,
      });
      return unauthorized("Invalid credentials");
    }

    const tokens = await createSession(user, {
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
      after: { channel: "mobile" },
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
      tokens,
    });
  } catch (e) {
    return handleError(e);
  }
}
