import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const accessSecret = new TextEncoder().encode(requireEnv("JWT_ACCESS_SECRET"));
const refreshSecret = new TextEncoder().encode(requireEnv("JWT_REFRESH_SECRET"));

const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL_SECONDS || 900);
const REFRESH_TTL = Number(process.env.JWT_REFRESH_TTL_SECONDS || 2_592_000);

export type AccessPayload = JWTPayload & {
  sub: string;
  role: Role;
  branchId: string | null;
  name: string;
};

export async function signAccessToken(
  payload: Omit<AccessPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(accessSecret);
}

export async function signRefreshToken(sub: string): Promise<string> {
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

export const TOKEN_TTL = {
  access: ACCESS_TTL,
  refresh: REFRESH_TTL,
};
