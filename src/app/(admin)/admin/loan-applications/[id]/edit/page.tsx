import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { LoanApplicationForm } from "@/features/loans/loan-application-form";
import { CustomerLoanIntake } from "@/features/loans/customer-loan-intake";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_BACK"] as const;

export default async function EditLoanApplicationPage({ params }: { params: { id: string } }) {
  const app = await prisma.loanApplication.findFirst({
    where: { id: params.id },
    include: {
      customer: {
        include: { documents: true },
      },
      documents: true,
    },
  });
  if (!app) notFound();
  if (!EDITABLE_STATUSES.includes(app.status as any)) notFound();

  const isIntake = app.source === "INTAKE";

  // For intake drafts, render the full CustomerLoanIntake form
  if (isIntake) {
    const branches = await prisma.branch.findMany({
      where: { isActive: true, deletedAt: { isSet: false } },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });

    const c = app.customer;
    const toDateStr = (d: Date | null) =>
      d ? d.toISOString().slice(0, 10) : "";

    return (
      <div>
        <PageHeader
          title={`Edit Intake Draft ${app.applicationNo}`}
          description="Update customer and loan details"
        />
        <CustomerLoanIntake
          branches={branches}
          successRedirect="/admin/loan-applications"
          initial={{
            applicationId: app.id,
            applicationNo: app.applicationNo,
            customer: {
              fullName: c.fullName,
              fatherOrHusband: c.fatherOrHusband,
              mobile: c.mobile,
              altMobile: c.altMobile,
              aadhaar: c.aadhaar,
              panOrTaxId: c.panOrTaxId,
              dob: toDateStr(c.dob),
              gender: c.gender,
              maritalStatus: c.maritalStatus,
              occupation: c.occupation,
              monthlyIncome: c.monthlyIncome,
              currentAddress: c.currentAddress,
              permanentAddress: c.permanentAddress,
              guarantorName: c.guarantorName,
              guarantorMobile: c.guarantorMobile,
              guarantorRelation: c.guarantorRelation,
              referenceName: c.referenceName,
              referenceMobile: c.referenceMobile,
              bankName: c.bankName,
              bankAccount: c.bankAccount,
              ifsc: c.ifsc,
              nomineeName: c.nomineeName,
              nomineeRelation: c.nomineeRelation,
              branchId: c.branchId,
              photoUrl: c.photoUrl,
              documents: c.documents.map((d) => ({ type: d.type, url: d.url })),
            },
            loan: {
              loanType: app.loanType as "DAILY" | "WEEKLY" | "MONTHLY",
              principal: app.principal,
              interestRate: app.interestRate,
              processingFee: app.processingFee,
              tenureCount: app.tenureCount,
              installmentAmount: app.installmentAmount,
              startDate: app.startDate.toISOString().slice(0, 10),
              purpose: app.purpose,
              notes: app.notes,
              documents: app.documents.map((d) => ({ type: d.type, url: d.url })),
            },
          }}
        />
      </div>
    );
  }

  // For standard (existing customer) applications, use LoanApplicationForm
  const [customersRaw, branches] = await Promise.all([
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
