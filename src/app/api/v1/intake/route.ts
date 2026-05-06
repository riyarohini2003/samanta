import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { loanIntakeSchema } from "@/lib/zod-schemas/loan";
import { calculateLoan } from "@/server/services/loan-calculator";
import { nextApplicationNo, nextCustomerCode } from "@/server/counters";
import {
  created,
  handleError,
  unauthorized,
  forbidden,
} from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = loanIntakeSchema.parse(await req.json());
    const { customer: c, loan: l } = body;

    // Employees / branch managers can only create customers in their own branch.
    if (me.role === "EMPLOYEE" || me.role === "BRANCH_MANAGER") {
      if (c.branchId !== me.branchId) {
        return forbidden("You can only create customers in your own branch");
      }
    }

    const calc = calculateLoan({ ...l, startDate: l.startDate });
    const isDraft = l.asDraft === true;
    const isSelfCalc = l.selfCalculate === true;

    // When self-calculate mode is used, prefer user-provided values over calculated ones
    const finalInterest = isSelfCalc && l.interestAmount != null ? l.interestAmount : calc.interestAmount;
    const finalTotal = isSelfCalc && l.totalPayable != null ? l.totalPayable : calc.totalPayable;
    const finalInstallment = l.installmentAmount ?? (isSelfCalc ? Math.round(finalTotal / l.tenureCount) : calc.installmentAmount);

    const result = await prisma.$transaction(async (tx) => {
      const customerCode = await nextCustomerCode(tx);
      const { documents: cDocs, ...cRest } = c;
      const customer = await tx.customer.create({
        data: {
          ...cRest,
          customerCode,
          dob: cRest.dob ? new Date(cRest.dob) : null,
          monthlyIncome: cRest.monthlyIncome ?? null,
          createdById: me.id,
          documents: cDocs && cDocs.length
            ? { create: cDocs.map((d) => ({ type: d.type, url: d.url })) }
            : undefined,
        },
      });

      const applicationNo = await nextApplicationNo(tx);
      const application = await tx.loanApplication.create({
        data: {
          applicationNo,
          customerId: customer.id,
          branchId: customer.branchId,
          loanType: l.loanType,
          principal: calc.principal,
          interestRate: l.interestRate,
          processingFee: calc.processingFee,
          tenureCount: l.tenureCount,
          installmentAmount: finalInstallment,
          totalPayable: finalTotal,
          interestAmount: finalInterest,
          startDate: calc.startDate,
          maturityDate: calc.maturityDate,
          purpose: l.purpose,
          notes: l.notes,
          source: "INTAKE",
          status: isDraft ? "DRAFT" : "SUBMITTED",
          createdById: me.id,
          documents: l.documents && l.documents.length
            ? { create: l.documents.map((d) => ({ type: d.type, url: d.url })) }
            : undefined,
        },
      });

      return { customer, application };
    });

    await writeAudit({
      userId: me.id,
      action: isDraft ? "INTAKE_DRAFTED" : "INTAKE_SUBMITTED",
      entityType: "LoanApplication",
      entityId: result.application.id,
      after: result,
      ...getRequestMeta(req),
    });

    return created({
      customerId: result.customer.id,
      customerCode: result.customer.customerCode,
      applicationId: result.application.id,
      applicationNo: result.application.applicationNo,
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
