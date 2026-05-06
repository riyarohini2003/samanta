import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { loanIntakeUpdateSchema } from "@/lib/zod-schemas/loan";
import { calculateLoan } from "@/server/services/loan-calculator";
import { ok, handleError, notFound, unauthorized, forbidden, badRequest } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

const EDITABLE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_BACK"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    const body = loanIntakeUpdateSchema.parse(await req.json());
    const { customer: cUpdate, loan: lUpdate } = body;

    const app = await prisma.loanApplication.findFirst({
      where: { id: params.id, source: "INTAKE", ...scopeWhere(me) },
    });
    if (!app) return notFound("Application not found");
    if (!EDITABLE_STATUSES.includes(app.status as any)) {
      return badRequest(`Cannot edit — application is ${app.status}`);
    }
    if (me.role === "EMPLOYEE" && app.createdById !== me.id) {
      return forbidden("You can only edit applications you created");
    }

    const isDraft = lUpdate.asDraft !== false;
    const isSelfCalc = lUpdate.selfCalculate === true;

    // Merge loan inputs with existing values
    const merged = {
      loanType: (lUpdate.loanType ?? app.loanType) as "DAILY" | "WEEKLY" | "MONTHLY",
      principal: lUpdate.principal ?? app.principal,
      interestRate: lUpdate.interestRate ?? app.interestRate,
      processingFee: lUpdate.processingFee ?? app.processingFee,
      tenureCount: lUpdate.tenureCount ?? app.tenureCount,
      startDate: lUpdate.startDate ?? app.startDate.toISOString(),
      interestMethod: (lUpdate.interestMethod ?? "SIMPLE") as "SIMPLE" | "COMPOUND",
      ratePeriod: (lUpdate.ratePeriod ?? "ANNUAL") as "WEEKLY" | "MONTHLY" | "ANNUAL",
    };
    const calc = calculateLoan(merged);

    const finalInterest = isSelfCalc && lUpdate.interestAmount != null ? lUpdate.interestAmount : calc.interestAmount;
    const finalTotal = isSelfCalc && lUpdate.totalPayable != null ? lUpdate.totalPayable : calc.totalPayable;
    const finalInstallment = lUpdate.installmentAmount ?? (isSelfCalc ? Math.round(finalTotal / merged.tenureCount) : calc.installmentAmount);

    const result = await prisma.$transaction(async (tx) => {
      // Update customer fields
      const customer = await tx.customer.update({
        where: { id: app.customerId },
        data: {
          ...cUpdate,
          dob: cUpdate.dob ? new Date(cUpdate.dob) : undefined,
          monthlyIncome: cUpdate.monthlyIncome ?? undefined,
          documents: cUpdate.documents?.length
            ? {
                deleteMany: {},
                create: cUpdate.documents.map((d) => ({ type: d.type, url: d.url })),
              }
            : undefined,
        },
      });

      // Update loan application
      const application = await tx.loanApplication.update({
        where: { id: params.id },
        data: {
          loanType: merged.loanType,
          principal: calc.principal,
          interestRate: merged.interestRate,
          processingFee: calc.processingFee,
          tenureCount: merged.tenureCount,
          installmentAmount: finalInstallment,
          totalPayable: finalTotal,
          interestAmount: finalInterest,
          startDate: calc.startDate,
          maturityDate: calc.maturityDate,
          purpose: lUpdate.purpose ?? app.purpose,
          notes: lUpdate.notes ?? app.notes,
          status: isDraft ? "DRAFT" : "SUBMITTED",
          documents: lUpdate.documents?.length
            ? {
                deleteMany: {},
                create: lUpdate.documents.map((d) => ({ type: d.type, url: d.url })),
              }
            : undefined,
        },
      });

      return { customer, application };
    });

    await writeAudit({
      userId: me.id,
      action: isDraft ? "INTAKE_DRAFT_UPDATED" : "INTAKE_SUBMITTED",
      entityType: "LoanApplication",
      entityId: app.id,
      after: result,
      ...getRequestMeta(req),
    });

    return ok({
      customerId: result.customer.id,
      applicationId: result.application.id,
      applicationNo: result.application.applicationNo,
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
