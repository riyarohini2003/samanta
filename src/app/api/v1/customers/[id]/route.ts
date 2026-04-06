import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, requireRole, AuthError } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { customerUpdateSchema } from "@/lib/zod-schemas/customer";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const c = await prisma.customer.findFirst({
      where: { id: params.id, deletedAt: { isSet: false }, ...scopeWhere(me) },
      include: {
        branch: true,
        documents: true,
        loans: { orderBy: { createdAt: "desc" } },
        applications: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!c) return notFound();
    return ok(c);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const body = customerUpdateSchema.parse(await req.json());
    const before = await prisma.customer.findFirst({
      where: { id: params.id, deletedAt: { isSet: false }, ...scopeWhere(me) },
    });
    if (!before) return notFound();

    const { documents, ...rest } = body;
    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...rest,
        dob: rest.dob ? new Date(rest.dob) : undefined,
      },
    });
    if (documents && documents.length) {
      await prisma.customerDocument.createMany({
        data: documents.map((d) => ({ customerId: updated.id, type: d.type, url: d.url })),
      });
    }
    await writeAudit({
      userId: me.id,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
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

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, deletedAt: { isSet: false } },
    });
    if (!existing) return notFound("Customer not found");

    const activeLoans = await prisma.loanAccount.count({
      where: { customerId: params.id, status: { in: ["ACTIVE", "OVERDUE", "NPA"] } },
    });
    if (activeLoans > 0) {
      return badRequest(`Cannot delete — customer has ${activeLoans} active loan${activeLoans === 1 ? "" : "s"}`);
    }

    const deleted = await prisma.customer.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });
    await writeAudit({
      userId: user.id,
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: deleted.id,
      ...getRequestMeta(req),
    });
    return ok({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
