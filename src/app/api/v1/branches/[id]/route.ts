import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { branchUpdateSchema } from "@/lib/zod-schemas/branch";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER", "EMPLOYEE");
    const branch = await prisma.branch.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
      include: { _count: { select: { users: true, loans: true, customers: true } } },
    });
    if (!branch) return notFound("Branch not found");
    return ok(branch);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = branchUpdateSchema.parse(await req.json());
    const before = await prisma.branch.findUnique({ where: { id: params.id } });
    if (!before) return notFound("Branch not found");

    const updated = await prisma.branch.update({ where: { id: params.id }, data: body });
    await writeAudit({
      userId: user.id,
      action: "BRANCH_UPDATED",
      entityType: "Branch",
      entityId: updated.id,
      before,
      after: updated,
      ...getRequestMeta(req),
    });
    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");

    const existing = await prisma.branch.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
    });
    if (!existing) return notFound("Branch not found");

    // Guardrail: block delete if branch has active users, customers, or loans
    const [activeUsers, activeCustomers, activeLoans] = await Promise.all([
      prisma.user.count({ where: { branchId: params.id, deletedAt: { isSet: false }, isActive: true } }),
      prisma.customer.count({ where: { branchId: params.id, deletedAt: { isSet: false } } }),
      prisma.loanAccount.count({ where: { branchId: params.id, status: { in: ["ACTIVE", "OVERDUE", "NPA"] } } }),
    ]);
    if (activeUsers > 0 || activeCustomers > 0 || activeLoans > 0) {
      const parts: string[] = [];
      if (activeUsers) parts.push(`${activeUsers} employee${activeUsers === 1 ? "" : "s"}`);
      if (activeCustomers) parts.push(`${activeCustomers} customer${activeCustomers === 1 ? "" : "s"}`);
      if (activeLoans) parts.push(`${activeLoans} active loan${activeLoans === 1 ? "" : "s"}`);
      return badRequest(`Cannot delete — branch has ${parts.join(", ")}`);
    }

    const branch = await prisma.branch.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await writeAudit({
      userId: user.id,
      action: "BRANCH_DELETED",
      entityType: "Branch",
      entityId: branch.id,
      ...getRequestMeta(req),
    });
    return ok({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
