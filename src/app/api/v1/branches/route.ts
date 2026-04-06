import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { branchCreateSchema } from "@/lib/zod-schemas/branch";
import { ok, created, handleError, unauthorized, forbidden } from "@/lib/api";
import { nextBranchCode } from "@/server/counters";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(req: NextRequest) {
  try {
    await requireRole("SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER", "EMPLOYEE");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const includeInactive = searchParams.get("includeInactive") === "1";

    const branches = await prisma.branch.findMany({
      where: {
        deletedAt: { isSet: false },
        ...(includeInactive ? {} : { isActive: true }),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, loans: true, customers: true } } },
    });

    return ok(branches);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = branchCreateSchema.parse(await req.json());
    const code = await nextBranchCode();

    const branch = await prisma.branch.create({
      data: { ...body, code, managerId: body.managerId || null },
    });

    await writeAudit({
      userId: user.id,
      action: "BRANCH_CREATED",
      entityType: "Branch",
      entityId: branch.id,
      after: branch,
      ...getRequestMeta(req),
    });

    return created(branch);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
