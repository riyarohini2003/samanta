import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { customerCreateSchema } from "@/lib/zod-schemas/customer";
import { scopeWhere } from "@/server/auth/guards";
import { ok, created, handleError, unauthorized, forbidden } from "@/lib/api";
import { nextCustomerCode } from "@/server/counters";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const branchId = searchParams.get("branchId") ?? undefined;

    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: { isSet: false },
        ...scopeWhere(me),
        ...(branchId ? { branchId } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { customerCode: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
                { aadhaar: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        _count: { select: { loans: true, applications: true } },
      },
    });
    return ok(customers);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = customerCreateSchema.parse(await req.json());

    // Employees can only create customers in their branch
    if (me.role === "EMPLOYEE" || me.role === "BRANCH_MANAGER") {
      if (body.branchId !== me.branchId) {
        return forbidden("You can only create customers in your own branch");
      }
    }

    const customerCode = await nextCustomerCode();
    const { documents, ...rest } = body;
    const customer = await prisma.customer.create({
      data: {
        ...rest,
        customerCode,
        dob: rest.dob ? new Date(rest.dob) : null,
        monthlyIncome: rest.monthlyIncome ?? null,
        createdById: me.id,
        documents: documents && documents.length
          ? { create: documents.map((d) => ({ type: d.type, url: d.url })) }
          : undefined,
      },
    });

    await writeAudit({
      userId: me.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      after: customer,
      ...getRequestMeta(req),
    });

    return created(customer);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
