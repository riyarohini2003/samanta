import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/constants";
import { verifyRefreshToken, signAccessToken, TOKEN_TTL } from "@/server/auth/jwt";
import { prisma } from "@/server/db";
import { ok, unauthorized, handleError } from "@/lib/api";

export async function POST() {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get(COOKIE_NAMES.refresh)?.value;
    if (!refreshToken) return unauthorized("No refresh token");

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) return unauthorized("Invalid or expired refresh token");

    // Verify the session still exists and hasn't been revoked
    const session = await prisma.session.findFirst({
      where: { refreshToken, userId: payload.sub },
    });
    if (!session || session.expiresAt < new Date()) {
      return unauthorized("Session expired or revoked");
    }

    // Fetch the user to build the access token payload
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

    const secure = process.env.NODE_ENV === "production";
    const domain = process.env.COOKIE_DOMAIN || undefined;

    cookieStore.set(COOKIE_NAMES.access, accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_TTL.access,
      domain,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
