import { cookies } from "next/headers";
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

  const cookieStore = cookies();
  const secure = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN || undefined;

  cookieStore.set(COOKIE_NAMES.access, access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL.access,
    domain,
  });
  cookieStore.set(COOKIE_NAMES.refresh, refresh, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL.refresh,
    domain,
  });

  return { access, refresh };
}

export async function destroySession() {
  const cookieStore = cookies();
  const refresh = cookieStore.get(COOKIE_NAMES.refresh)?.value;
  if (refresh) {
    await prisma.session
      .deleteMany({ where: { refreshToken: refresh } })
      .catch(() => null);
  }
  cookieStore.delete(COOKIE_NAMES.access);
  cookieStore.delete(COOKIE_NAMES.refresh);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(COOKIE_NAMES.access)?.value;
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
