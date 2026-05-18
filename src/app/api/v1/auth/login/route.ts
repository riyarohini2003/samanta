import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { loginSchema } from "@/lib/zod-schemas/auth";
import { verifyPassword } from "@/server/auth/password";
import { createSession, setAuthCookies } from "@/server/auth/session";
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

    // Try exact match first, then with +91 prefix for bare 10-digit phone numbers.
    // Plain `equals` (no `mode: "insensitive"`) avoids the MongoDB regex path —
    // values like "+919771219353" contain a leading `+` that would otherwise be
    // interpreted as a regex quantifier and crash the query.
    let user = await prisma.user.findFirst({
      where: { loginId: body.loginId },
    });
    if (!user && /^\d{10}$/.test(body.loginId)) {
      user = await prisma.user.findFirst({
        where: { loginId: `+91${body.loginId}` },
      });
    }
    // Case-insensitive fallback only when the input is regex-safe (usernames like
    // "rahul.k"). Phone-shaped inputs containing `+` are excluded here.
    if (!user && /^[a-zA-Z0-9._\-]+$/.test(body.loginId)) {
      user = await prisma.user.findFirst({
        where: { loginId: { equals: body.loginId, mode: "insensitive" } },
      });
    }
    // Also try matching by mobile number for users whose loginId is a username
    // but who type their phone number on the login screen.
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
      ...meta,
    });

    const res = ok({
      user: {
        id: user.id,
        name: user.name,
        loginId: user.loginId,
        role: user.role,
        branchId: user.branchId,
      },
      redirect: user.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
    });
    setAuthCookies(res, tokens);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
