import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { ok, forbidden, unauthorized, badRequest, handleError } from "@/lib/api";
import { runImportFromBuffer } from "@/server/services/bulk-import-service";
import { writeAudit, getRequestMeta } from "@/server/audit";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

export async function GET() {
  try {
    const me = await requireUser();
    if (!ADMIN_ROLES.has(me.role)) return forbidden("Only admins can run bulk import");
    const [branches, employees] = await Promise.all([
      prisma.branch.findMany({
        where: { isActive: true, deletedAt: { isSet: false } },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: { isSet: false },
          role: { in: ["EMPLOYEE", "BRANCH_MANAGER", "ADMIN", "SUPER_ADMIN"] },
        },
        select: { id: true, employeeCode: true, name: true, role: true, branchId: true },
        orderBy: { employeeCode: "asc" },
      }),
    ]);
    return ok({ branches, employees });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    if (!ADMIN_ROLES.has(me.role)) return forbidden("Only admins can run bulk import");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) return badRequest("Missing 'file' in form data");
    const commit = req.nextUrl.searchParams.get("commit") === "true";
    const defaultBranchId = (form.get("defaultBranchId") as string | null) || undefined;
    const defaultAssignedEmployeeId = (form.get("defaultAssignedEmployeeId") as string | null) || undefined;

    const buf = Buffer.from(await file.arrayBuffer());
    const report = await runImportFromBuffer(buf, {
      commit,
      actorUserId: me.id,
      defaultBranchId,
      defaultAssignedEmployeeId,
    });

    if (commit) {
      await writeAudit({
        userId: me.id,
        action: "BULK_IMPORT",
        entityType: "System",
        entityId: "bulk-import",
        after: report.summary,
        ...getRequestMeta(req),
      });
    }

    return ok(report);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
