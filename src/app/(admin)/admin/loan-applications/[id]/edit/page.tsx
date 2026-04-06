import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { LoanApplicationForm } from "@/features/loans/loan-application-form";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_BACK"] as const;

export default async function EditLoanApplicationPage({ params }: { params: { id: string } }) {
  const [app, customersRaw, branches] = await Promise.all([
    prisma.loanApplication.findFirst({
      where: { id: params.id },
      include: { customer: { select: { branchId: true } } },
    }),
    prisma.customer.findMany({
      where: { deletedAt: { isSet: false } },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        customerCode: true,
        fullName: true,
        mobile: true,
        branchId: true,
        branch: { select: { name: true } },
      },
      take: 2000,
    }),
    prisma.branch.findMany({
      where: { isActive: true, deletedAt: { isSet: false } },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);
  if (!app) notFound();
  if (!EDITABLE_STATUSES.includes(app.status as any)) {
    // Redirect / 404 if not editable
    notFound();
  }

  const customers = customersRaw.map((c) => ({
    id: c.id,
    customerCode: c.customerCode,
    fullName: c.fullName,
    mobile: c.mobile,
    branchId: c.branchId,
    branchName: c.branch?.name,
  }));

  return (
    <div>
      <PageHeader title={`Edit ${app.applicationNo}`} description="Update loan application details" />
      <LoanApplicationForm
        customers={customers}
        branches={branches}
        returnTo="/admin/loan-applications"
        initial={{
          id: app.id,
          applicationNo: app.applicationNo,
          customerId: app.customerId,
          loanType: app.loanType as "DAILY" | "WEEKLY" | "MONTHLY",
          principal: app.principal,
          interestRate: app.interestRate,
          processingFee: app.processingFee,
          tenureCount: app.tenureCount,
          startDate: app.startDate,
          purpose: app.purpose,
          notes: app.notes,
        }}
      />
    </div>
  );
}
