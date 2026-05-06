import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { loanApplicationCreateSchema } from "@/lib/zod-schemas/loan";
import { calculateLoan } from "@/server/services/loan-calculator";
import { nextApplicationNo } from "@/server/counters";
import { ok, created, handleError, unauthorized, forbidden, notFound } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const employeeId = searchParams.get("employeeId") ?? undefined;

    const apps = await prisma.loanApplication.findMany({
      where: {
        ...scopeWhere(me),
        ...(me.role === "EMPLOYEE" ? { createdById: me.id } : {}),
        ...(status ? { status: status as any } : {}),
        ...(branchId ? { branchId } : {}),
        ...(employeeId ? { createdById: employeeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { id: true, customerCode: true, fullName: true, mobile: true } },
        branch: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return ok(apps);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const body = loanApplicationCreateSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({
      where: { id: body.customerId, deletedAt: { isSet: false }, ...scopeWhere(me) },
    });
    if (!customer) return notFound("Customer not found or not in your scope");

    const calc = calculateLoan({ ...body, startDate: body.startDate });
    const applicationNo = await nextApplicationNo();
    const isDraft = body.asDraft === true;

    const app = await prisma.loanApplication.create({
      data: {
        applicationNo,
        customerId: customer.id,
        branchId: customer.branchId,
        loanType: body.loanType,
        principal: calc.principal,
        interestRate: body.interestRate,
        processingFee: calc.processingFee,
        tenureCount: body.tenureCount,
        installmentAmount: calc.installmentAmount,
        totalPayable: calc.totalPayable,
        interestAmount: calc.interestAmount,
        startDate: calc.startDate,
        maturityDate: calc.maturityDate,
        purpose: body.purpose,
        notes: body.notes,
        source: "STANDARD",
        status: isDraft ? "DRAFT" : "SUBMITTED",
        createdById: me.id,
        documents: body.documents && body.documents.length
          ? { create: body.documents.map((d) => ({ type: d.type, url: d.url })) }
          : undefined,
      },
    });

    await writeAudit({
      userId: me.id,
      action: isDraft ? "APPLICATION_DRAFTED" : "APPLICATION_SUBMITTED",
      entityType: "LoanApplication",
      entityId: app.id,
      after: app,
      ...getRequestMeta(req),
    });

    return created(app);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
