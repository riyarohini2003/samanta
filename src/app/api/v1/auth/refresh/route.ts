import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { COOKIE_NAMES } from "@/lib/constants";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  TOKEN_TTL,
} from "@/server/auth/jwt";
import { prisma } from "@/server/db";
import { ok, unauthorized, handleError } from "@/lib/api";

/**
 * Accepts the refresh token either from the httpOnly `samanta_rt` cookie
 * (web) or from an `X-Refresh-Token` header (mobile / Bearer flow).
 *
 * Mobile clients receive both fresh tokens in the JSON body. Web clients
 * get the new access token as a Set-Cookie, identical to the prior behavior.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const headerRefresh = req.headers.get("x-refresh-token");
    const cookieRefresh = cookieStore.get(COOKIE_NAMES.refresh)?.value;
    const refreshToken = headerRefresh || cookieRefresh;
    if (!refreshToken) return unauthorized("No refresh token");

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) return unauthorized("Invalid or expired refresh token");

    const session = await prisma.session.findFirst({
      where: { refreshToken, userId: payload.sub },
    });
    if (!session || session.expiresAt < new Date()) {
      return unauthorized("Session expired or revoked");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, branchId: true, name: true, isActive: true, deletedAt: true },
    });
    if (!user || !user.isActive || user.deletedAt) {
      return unauthorized("Account is inactive");
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      role: user.role,
      branchId: user.branchId,
      name: user.name,
    });

    // Mobile flow: also issue a fresh refresh token and rotate the session row
    // so long-lived clients keep sliding their refresh window.
    if (headerRefresh) {
      const newRefresh = await signRefreshToken(user.id);
      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: newRefresh,
          expiresAt: new Date(Date.now() + TOKEN_TTL.refresh * 1000),
        },
      });
      return ok({
        tokens: {
          access: accessToken,
          refresh: newRefresh,
        },
      });
    }

    const res = ok({ success: true });
    res.cookies.set(COOKIE_NAMES.access, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_TTL.access,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
