import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { employeeUpdateSchema } from "@/lib/zod-schemas/employee";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER");
    const u = await prisma.user.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
      include: { branch: true },
    });
    if (!u) return notFound();
    const { passwordHash, ...safe } = u;
    return ok(safe);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = employeeUpdateSchema.parse(await req.json());
    const before = await prisma.user.findUnique({ where: { id: params.id } });
    if (!before) return notFound();
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        email: body.email,
        mobile: body.mobile ?? undefined,
        role: body.role ?? undefined,
        branchId: body.branchId ?? undefined,
        address: body.address ?? undefined,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
        isActive: body.isActive ?? undefined,
      },
    });
    await writeAudit({
      userId: me.id,
      action: "EMPLOYEE_UPDATED",
      entityType: "User",
      entityId: updated.id,
      before: { ...before, passwordHash: "[redacted]" },
      after: { ...updated, passwordHash: "[redacted]" },
      ...getRequestMeta(req),
    });
    const { passwordHash, ...safe } = updated;
    return ok(safe);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");

    const target = await prisma.user.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
    });
    if (!target) return notFound("Employee not found");
    if (target.role === "SUPER_ADMIN") return badRequest("Cannot delete the CEO account");
    if (target.id === me.id) return badRequest("You cannot delete your own account");

    const activeLoans = await prisma.loanAccount.count({
      where: { assignedEmployeeId: params.id, status: { in: ["ACTIVE", "OVERDUE", "NPA"] } },
    });
    if (activeLoans > 0) {
      return badRequest(`Cannot delete — employee has ${activeLoans} active loan${activeLoans === 1 ? "" : "s"} assigned. Reassign first.`);
    }

    const deleted = await prisma.user.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        // Free up unique fields so they can be reused by new employees
        loginId: `${target.loginId}_deleted_${Date.now()}`,
        email: target.email ? `${target.email}_deleted_${Date.now()}` : null,
      },
    });
    await writeAudit({
      userId: me.id,
      action: "EMPLOYEE_DELETED",
      entityType: "User",
      entityId: deleted.id,
      ...getRequestMeta(req),
    });
    return ok({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
