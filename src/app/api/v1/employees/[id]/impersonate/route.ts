import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, destroySession, createSession, AuthError } from "@/server/auth/session";
import { ok, handleError, unauthorized, forbidden, notFound, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

/** Impersonation sessions expire after 30 minutes */
const IMPERSONATE_MAX_MINUTES = 30;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");

    if (params.id === me.id) {
      return badRequest("You cannot impersonate yourself");
    }

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target || target.deletedAt) return notFound("Employee not found");
    if (!target.isActive) return badRequest("Employee is inactive");
    if (target.role === "SUPER_ADMIN") return forbidden("Cannot impersonate the CEO");
    if (target.role === "ADMIN" && me.role !== "SUPER_ADMIN") {
      return forbidden("Only the CEO can impersonate other admins");
    }

    const meta = getRequestMeta(req);

    // Drop the admin's current session and issue a short-lived one for the target user.
    await destroySession();
    await createSession(target, {
      ip: meta.ip ?? undefined,
      userAgent: meta.userAgent ?? undefined,
    });

    // Shorten the session so impersonation auto-expires
    const impersonationExpiry = new Date(Date.now() + IMPERSONATE_MAX_MINUTES * 60 * 1000);
    await prisma.session.updateMany({
      where: { userId: target.id, ip: meta.ip },
      data: { expiresAt: impersonationExpiry },
    });

    await writeAudit({
      userId: me.id,
      action: "EMPLOYEE_IMPERSONATE",
      entityType: "User",
      entityId: target.id,
      after: {
        impersonatedBy: me.id,
        impersonatedByLogin: me.loginId,
        impersonatedAs: target.loginId,
        expiresAt: impersonationExpiry.toISOString(),
      },
      ...meta,
    });

    return ok({
      success: true,
      redirect: target.role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard",
      user: {
        id: target.id,
        name: target.name,
        loginId: target.loginId,
        role: target.role,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
