import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { loanApplicationUpdateSchema } from "@/lib/zod-schemas/loan";
import { calculateLoan } from "@/server/services/loan-calculator";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

const EDITABLE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_BACK"] as const;
const DELETABLE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REJECTED", "SENT_BACK"] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const app = await prisma.loanApplication.findFirst({
      where: { id: params.id, ...scopeWhere(me) },
      include: {
        customer: true,
        branch: true,
        createdBy: { select: { id: true, name: true, employeeCode: true } },
        reviewedBy: { select: { id: true, name: true } },
        loanAccount: true,
      },
    });
    if (!app) return notFound();
    return ok(app);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const body = loanApplicationUpdateSchema.parse(await req.json());

    const before = await prisma.loanApplication.findFirst({
      where: { id: params.id, ...scopeWhere(me) },
    });
    if (!before) return notFound("Application not found");
    if (!EDITABLE_STATUSES.includes(before.status as any)) {
      return badRequest(`Cannot edit — application is ${before.status}. Only ${EDITABLE_STATUSES.join(", ")} can be edited.`);
    }
    // Employees can only edit their own submissions
    if (me.role === "EMPLOYEE" && before.createdById !== me.id) {
      return forbidden("You can only edit applications you created");
    }

    // Merge inputs with existing values, then recalculate
    const merged = {
      loanType: (body.loanType ?? before.loanType) as "DAILY" | "WEEKLY" | "MONTHLY",
      principal: body.principal ?? before.principal,
      interestRate: body.interestRate ?? before.interestRate,
      processingFee: body.processingFee ?? before.processingFee,
      tenureCount: body.tenureCount ?? before.tenureCount,
      startDate: body.startDate ?? before.startDate.toISOString(),
      interestMethod: (body.interestMethod ?? "SIMPLE") as "SIMPLE" | "COMPOUND",
      ratePeriod: (body.ratePeriod ?? "ANNUAL") as "WEEKLY" | "MONTHLY" | "ANNUAL",
    };
    const calc = calculateLoan(merged);

    // Manual overrides for EMI / Total Payable — fall back to calculated values.
    const finalTotalPayable = body.totalPayable ?? calc.totalPayable;
    const finalInstallmentAmount = body.installmentAmount ?? calc.installmentAmount;
    // If Total Payable is overridden, derive interestAmount from it so values stay consistent.
    const finalInterestAmount =
      body.totalPayable != null
        ? Math.round((body.totalPayable - calc.principal) * 100) / 100
        : calc.interestAmount;

    const updated = await prisma.loanApplication.update({
      where: { id: params.id },
      data: {
        loanType: merged.loanType,
        principal: calc.principal,
        interestRate: merged.interestRate,
        processingFee: calc.processingFee,
        tenureCount: merged.tenureCount,
        installmentAmount: finalInstallmentAmount,
        totalPayable: finalTotalPayable,
        interestAmount: finalInterestAmount,
        startDate: calc.startDate,
        maturityDate: calc.maturityDate,
        purpose: body.purpose ?? before.purpose,
        notes: body.notes ?? before.notes,
      },
    });

    await writeAudit({
      userId: me.id,
      action: "APPLICATION_UPDATED",
      entityType: "LoanApplication",
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
    const me = await requireUser();

    const target = await prisma.loanApplication.findFirst({
      where: { id: params.id, ...scopeWhere(me) },
    });
    if (!target) return notFound("Application not found");
    if (!DELETABLE_STATUSES.includes(target.status as any)) {
      return badRequest(`Cannot delete — application is ${target.status}. Only ${DELETABLE_STATUSES.join(", ")} can be deleted.`);
    }
    // Employees can only delete their own draft/submitted applications
    if (me.role === "EMPLOYEE" && target.createdById !== me.id) {
      return forbidden("You can only delete applications you created");
    }

    // Block if a loan account was already created from this application
    const linkedAccount = await prisma.loanAccount.findFirst({
      where: { applicationId: params.id },
      select: { id: true, accountNo: true },
    });
    if (linkedAccount) {
      return badRequest(`Cannot delete — loan account ${linkedAccount.accountNo} already exists for this application`);
    }

    await prisma.loanApplication.delete({ where: { id: params.id } });

    await writeAudit({
      userId: me.id,
      action: "APPLICATION_DELETED",
      entityType: "LoanApplication",
      entityId: params.id,
      before: target,
      ...getRequestMeta(req),
    });

    return ok({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
