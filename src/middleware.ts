import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken, type AccessPayload } from "@/server/auth/jwt";
import { COOKIE_NAMES } from "@/lib/constants";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/v1/auth/login",
  "/api/v1/auth/login-mobile",
  "/api/v1/auth/logout",
  "/api/v1/auth/refresh",
  "/api/health",
];

// Origins allowed to call /api/* from a browser. Capacitor native HTTP bypasses
// CORS entirely, so this only matters for the Vite web preview during dev.
// We accept any localhost / 127.0.0.1 port AND private LAN ranges so a phone on
// the same Wi-Fi can hit the dev server while the laptop runs Vite.
function isDevOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
    origin,
  );
}

function applyCors(res: NextResponse, origin: string) {
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept",
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const isDevCorsRequest =
    process.env.NODE_ENV !== "production" &&
    req.nextUrl.pathname.startsWith("/api/") &&
    isDevOrigin(origin);

  if (isDevCorsRequest && req.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }), origin!);
  }

  const res = await handle(req);
  return isDevCorsRequest ? applyCors(res, origin!) : res;
}

async function attemptSilentRefresh(
  req: NextRequest,
): Promise<{ payload: AccessPayload; setCookie: string } | null> {
  if (!req.cookies.get(COOKIE_NAMES.refresh)?.value) return null;
  try {
    const refreshRes = await fetch(new URL("/api/v1/auth/refresh", req.url), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (!refreshRes.ok) return null;

    const setCookies =
      typeof refreshRes.headers.getSetCookie === "function"
        ? refreshRes.headers.getSetCookie()
        : [refreshRes.headers.get("set-cookie") ?? ""];
    const accessCookie = setCookies.find((c) =>
      c.startsWith(`${COOKIE_NAMES.access}=`),
    );
    if (!accessCookie) return null;

    const newAccess = accessCookie.split(";")[0].slice(COOKIE_NAMES.access.length + 1);
    const payload = await verifyAccessToken(newAccess);
    if (!payload) return null;

    return { payload, setCookie: accessCookie };
  } catch {
    return null;
  }
}

async function handle(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookieToken = req.cookies.get(COOKIE_NAMES.access)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  const token = cookieToken ?? bearerToken ?? null;
  let payload = token ? await verifyAccessToken(token) : null;
  let refreshedCookie: string | null = null;

  // Silent refresh: if no valid access token but a refresh cookie is present,
  // mint a fresh access token via /api/v1/auth/refresh so the session continues.
  if (!payload && !bearerToken && !PUBLIC_PATHS.includes(pathname)) {
    const refreshed = await attemptSilentRefresh(req);
    if (refreshed) {
      payload = refreshed.payload;
      refreshedCookie = refreshed.setCookie;
    }
  }

  const isAuth = Boolean(payload);

  const withRefreshed = (res: NextResponse) => {
    if (refreshedCookie) res.headers.append("set-cookie", refreshedCookie);
    return res;
  };

  // Public routes: allow
  if (PUBLIC_PATHS.includes(pathname)) {
    if (pathname === "/login" && isAuth && !req.nextUrl.searchParams.has("next")) {
      return withRefreshed(NextResponse.redirect(
        new URL(
          payload!.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
          req.url
        )
      ));
    }
    if (pathname === "/" && isAuth) {
      return withRefreshed(NextResponse.redirect(
        new URL(
          payload!.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
          req.url
        )
      ));
    }
    return withRefreshed(NextResponse.next());
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
      return withRefreshed(NextResponse.redirect(new URL("/employee/dashboard", req.url)));
    }
  }

  // For protected requests that were silently refreshed, forward the new
  // access cookie on the current request too so server components/route
  // handlers in this same request see the fresh token.
  if (refreshedCookie) {
    const newAccess = refreshedCookie.split(";")[0].slice(COOKIE_NAMES.access.length + 1);
    const forwardedHeaders = new Headers(req.headers);
    const existingCookie = req.headers.get("cookie") ?? "";
    forwardedHeaders.set(
      "cookie",
      existingCookie
        ? `${existingCookie}; ${COOKIE_NAMES.access}=${newAccess}`
        : `${COOKIE_NAMES.access}=${newAccess}`,
    );
    const res = NextResponse.next({ request: { headers: forwardedHeaders } });
    res.headers.append("set-cookie", refreshedCookie);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
