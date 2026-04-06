import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/server/auth/jwt";
import { COOKIE_NAMES } from "@/lib/constants";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/refresh",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAMES.access)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  const isAuth = Boolean(payload);

  // Public routes: allow
  if (PUBLIC_PATHS.includes(pathname)) {
    // If already logged in and visiting /login, redirect to correct panel
    // BUT skip the redirect if the user just came from an internal redirect
    // (indicated by a "next" param) to avoid middleware ↔ layout redirect loops.
    if (pathname === "/login" && isAuth && !req.nextUrl.searchParams.has("next")) {
      return NextResponse.redirect(
        new URL(
          payload!.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
          req.url
        )
      );
    }
    if (pathname === "/" && isAuth) {
      return NextResponse.redirect(
        new URL(
          payload!.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
          req.url
        )
      );
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!isAuth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Role gating
  if (pathname.startsWith("/admin")) {
    if (payload!.role === "EMPLOYEE") {
      return NextResponse.redirect(new URL("/employee/dashboard", req.url));
    }
  }
  if (pathname.startsWith("/employee")) {
    // admins can view employee pages too, but redirect them to their own panel
    // actually: allow employees, branch managers and admins
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
