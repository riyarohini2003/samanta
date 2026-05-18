import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { ok, handleError, unauthorized, forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN");

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(Number(sp.get("limit") ?? "200") || 200, 1000);
    const action = sp.get("action") ?? undefined;
    const entityType = sp.get("entityType") ?? undefined;
    const userId = sp.get("userId") ?? undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
        ...(entityType
          ? { entityType: { contains: entityType, mode: "insensitive" } }
          : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { id: true, name: true, employeeCode: true } } },
    });

    return ok(logs);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
