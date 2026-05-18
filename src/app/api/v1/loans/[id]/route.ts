import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { isAdmin, loanScopeWhere } from "@/server/auth/guards";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const loan = await prisma.loanAccount.findFirst({
      where: { id: params.id, ...loanScopeWhere(me) },
      include: {
        customer: true,
        branch: true,
        assignedEmployee: { select: { id: true, name: true, employeeCode: true } },
        schedule: { orderBy: { installmentNo: "asc" } },
        payments: { orderBy: { collectedAt: "desc" }, take: 50 },
        application: true,
      },
    });
    if (!loan) return notFound();
    return ok(loan);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

const isoDate = z.string().refine((v) => !isNaN(new Date(v).getTime()), "Invalid date");

const loanAccountUpdateSchema = z
  .object({
    accountNo: z.string().min(1).optional(),
    loanType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    principal: z.coerce.number().nonnegative().optional(),
    interestAmount: z.coerce.number().nonnegative().optional(),
    processingFee: z.coerce.number().nonnegative().optional(),
    totalPayable: z.coerce.number().nonnegative().optional(),
    installmentAmount: z.coerce.number().nonnegative().optional(),
    paidAmount: z.coerce.number().nonnegative().optional(),
    pendingAmount: z.coerce.number().nonnegative().optional(),
    overdueAmount: z.coerce.number().nonnegative().optional(),
    penaltyAmount: z.coerce.number().nonnegative().optional(),
    disbursedAt: isoDate.optional(),
    disbursementMode: z.enum(["CASH", "BANK", "UPI", "CHEQUE"]).optional(),
    startDate: isoDate.optional(),
    maturityDate: isoDate.optional(),
    nextDueDate: isoDate.nullable().optional(),
    status: z.enum(["ACTIVE", "CLOSED", "OVERDUE", "NPA", "WRITTEN_OFF"]).optional(),
    closedAt: isoDate.nullable().optional(),
    assignedEmployeeId: z.string().min(1).optional(),
    branchId: z.string().min(1).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    if (!isAdmin(me)) return forbidden("Only admins can edit loan accounts");

    const body = loanAccountUpdateSchema.parse(await req.json());

    const before = await prisma.loanAccount.findUnique({ where: { id: params.id } });
    if (!before) return notFound();

    // Validate referenced foreign keys when changed
    if (body.branchId && body.branchId !== before.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: body.branchId } });
      if (!branch) return notFound("Branch not found");
    }
    if (body.assignedEmployeeId && body.assignedEmployeeId !== before.assignedEmployeeId) {
      const emp = await prisma.user.findUnique({ where: { id: body.assignedEmployeeId } });
      if (!emp) return notFound("Assigned employee not found");
    }

    const data: Record<string, unknown> = {};
    if (body.accountNo !== undefined) data.accountNo = body.accountNo;
    if (body.loanType !== undefined) data.loanType = body.loanType;
    if (body.principal !== undefined) data.principal = body.principal;
    if (body.interestAmount !== undefined) data.interestAmount = body.interestAmount;
    if (body.processingFee !== undefined) data.processingFee = body.processingFee;
    if (body.totalPayable !== undefined) data.totalPayable = body.totalPayable;
    if (body.installmentAmount !== undefined) data.installmentAmount = body.installmentAmount;
    if (body.paidAmount !== undefined) data.paidAmount = body.paidAmount;
    if (body.pendingAmount !== undefined) data.pendingAmount = body.pendingAmount;
    if (body.overdueAmount !== undefined) data.overdueAmount = body.overdueAmount;
    if (body.penaltyAmount !== undefined) data.penaltyAmount = body.penaltyAmount;
    if (body.disbursedAt !== undefined) data.disbursedAt = new Date(body.disbursedAt);
    if (body.disbursementMode !== undefined) data.disbursementMode = body.disbursementMode;
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
    if (body.maturityDate !== undefined) data.maturityDate = new Date(body.maturityDate);
    if (body.nextDueDate !== undefined) data.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.closedAt !== undefined) data.closedAt = body.closedAt ? new Date(body.closedAt) : null;
    if (body.assignedEmployeeId !== undefined) data.assignedEmployeeId = body.assignedEmployeeId;
    if (body.branchId !== undefined) data.branchId = body.branchId;

    const updated = await prisma.loanAccount.update({
      where: { id: params.id },
      data,
    });

    const meta = getRequestMeta(req);
    await writeAudit({
      userId: me.id,
      action: "LOAN_ACCOUNT_ADMIN_UPDATE",
      entityType: "LoanAccount",
      entityId: params.id,
      before,
      after: updated,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
