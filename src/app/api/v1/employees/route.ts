import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { employeeCreateSchema } from "@/lib/zod-schemas/employee";
import { hashPassword } from "@/server/auth/password";
import { ok, created, handleError, unauthorized, forbidden, conflict } from "@/lib/api";
import { nextEmployeeCode } from "@/server/counters";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(req: NextRequest) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN", "BRANCH_MANAGER");
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const branchId = searchParams.get("branchId") ?? undefined;

    const users = await prisma.user.findMany({
      where: {
        deletedAt: { isSet: false },
        role: { not: "SUPER_ADMIN" },
        ...(me.role === "BRANCH_MANAGER" ? { branchId: me.branchId ?? "__none__" } : {}),
        ...(branchId ? { branchId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { loginId: { contains: q, mode: "insensitive" } },
                { employeeCode: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { branch: { select: { id: true, code: true, name: true } } },
    });

    return ok(
      users.map((u) => ({
        id: u.id,
        employeeCode: u.employeeCode,
        loginId: u.loginId,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        isActive: u.isActive,
        branch: u.branch,
        joiningDate: u.joiningDate,
        createdAt: u.createdAt,
      }))
    );
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = employeeCreateSchema.parse(await req.json());

    // Check active (non-deleted) duplicates
    const existing = await prisma.user.findFirst({
      where: { loginId: body.loginId, deletedAt: { isSet: false } },
    });
    if (existing) return conflict("Login ID already taken");

    // Free up unique fields held by soft-deleted records so the DB constraint doesn't block us
    const suffix = `_deleted_${Date.now()}`;
    await prisma.user.updateMany({
      where: { loginId: body.loginId, deletedAt: { isSet: true } },
      data: { loginId: `${body.loginId}${suffix}` },
    });
    if (body.email) {
      await prisma.user.updateMany({
        where: { email: body.email, deletedAt: { isSet: true } },
        data: { email: `${body.email}${suffix}` },
      });
    }

    const [employeeCode, passwordHash] = await Promise.all([
      nextEmployeeCode(),
      hashPassword(body.password),
    ]);

    const user = await prisma.user.create({
      data: {
        employeeCode,
        loginId: body.loginId,
        passwordHash,
        name: body.name,
        email: body.email || null,
        mobile: body.mobile,
        role: body.role,
        branchId: body.branchId,
        address: body.address || null,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : new Date(),
      },
    });

    await writeAudit({
      userId: me.id,
      action: "EMPLOYEE_CREATED",
      entityType: "User",
      entityId: user.id,
      after: { ...user, passwordHash: "[redacted]" },
      ...getRequestMeta(req),
    });

    return created({
      id: user.id,
      employeeCode: user.employeeCode,
      loginId: user.loginId,
      name: user.name,
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
