import { NextRequest, NextResponse } from "next/server";
import { destroySession, clearAuthCookies } from "@/server/auth/session";
import { ok } from "@/lib/api";

export async function POST() {
  await destroySession();
  const res = ok({ success: true });
  clearAuthCookies(res);
  return res;
}

/** GET handler: clear session cookies and redirect to /login.
 *  Used by server-side redirects (layouts) to break redirect loops
 *  when the JWT is valid but the DB user is missing/inactive. */
export async function GET(req: NextRequest) {
  try {
    await destroySession();
  } catch {
    // DB might be unreachable — still clear cookies below
  }
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url);
  clearAuthCookies(res);
  return res;
}
