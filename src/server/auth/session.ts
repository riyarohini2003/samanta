import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/constants";
import { signAccessToken, signRefreshToken, TOKEN_TTL, verifyAccessToken } from "./jwt";
import { prisma } from "@/server/db";
import type { Role, User } from "@prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  loginId: string;
  role: Role;
  branchId: string | null;
  employeeCode: string;
  email: string | null;
  mobile: string;
  photoUrl: string | null;
};

/** Cookie options shared by login / refresh */
function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

/** Set auth cookies directly on a NextResponse (works reliably in Route Handlers). */
export function setAuthCookies(
  res: NextResponse,
  tokens: { access: string; refresh: string },
) {
  res.cookies.set(COOKIE_NAMES.access, tokens.access, cookieOpts(TOKEN_TTL.access));
  res.cookies.set(COOKIE_NAMES.refresh, tokens.refresh, cookieOpts(TOKEN_TTL.refresh));
}

/** Clear auth cookies on a NextResponse. */
export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(COOKIE_NAMES.access);
  res.cookies.delete(COOKIE_NAMES.refresh);
}

export async function createSession(user: User, meta: { ip?: string; userAgent?: string }) {
  const access = await signAccessToken({
    sub: user.id,
    role: user.role,
    branchId: user.branchId,
    name: user.name,
  });
  const refresh = await signRefreshToken(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: refresh,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: new Date(Date.now() + TOKEN_TTL.refresh * 1000),
    },
  });

  return { access, refresh };
}

export async function destroySession() {
  // Read the refresh token from the cookie (web flow) or the X-Refresh-Token
  // header (mobile / Bearer flow), so logout revokes the server-side session
  // in either case.
  const cookieStore = cookies();
  const headerRefresh = headers().get("x-refresh-token");
  const refresh = cookieStore.get(COOKIE_NAMES.refresh)?.value || headerRefresh;
  if (refresh) {
    await prisma.session
      .deleteMany({ where: { refreshToken: refresh } })
      .catch(() => null);
  }
}

function getAccessToken(): string | null {
  const cookieToken = cookies().get(COOKIE_NAMES.access)?.value;
  if (cookieToken) return cookieToken;
  const authHeader = headers().get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice("Bearer ".length);
  return null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = getAccessToken();
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub as string },
    select: {
      id: true,
      name: true,
      loginId: true,
      role: true,
      branchId: true,
      employeeCode: true,
      email: true,
      mobile: true,
      photoUrl: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!user || !user.isActive || user.deletedAt) return null;
  const { isActive, deletedAt, ...rest } = user;
  return rest;
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError("Unauthorized", 401);
  return u;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new AuthError("Forbidden", 403);
  return u;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
