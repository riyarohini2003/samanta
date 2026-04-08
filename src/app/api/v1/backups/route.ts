import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { ok, unauthorized, forbidden, handleError } from "@/lib/api";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

/** List all backup snapshots (newest first) */
export async function GET(_req: NextRequest) {
  try {
    const me = await requireUser();
    if (!ADMIN_ROLES.has(me.role)) {
      return forbidden("Only admins can view backups");
    }

    const snapshots = await prisma.backupSnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    return ok(snapshots);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
