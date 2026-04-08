import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const app = await prisma.loanApplication.findFirst({
    where: { id: params.id, createdById: me.id },
    include: {
      customer: {
        include: {
          branch: { select: { code: true, name: true } },
        },
      },
      branch: { select: { code: true, name: true } },
      createdBy: { select: { name: true, employeeCode: true } },
      reviewedBy: { select: { name: true } },
      loanAccount: { select: { accountNo: true, status: true } },
    },
  });

  if (!app) notFound();

  const c = app.customer;

  return (
    <div>
      <PageHeader
        title={`Application ${app.applicationNo}`}
        description={`${c.fullName} - ${c.customerCode}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/employee/loan-applications">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Application Status & Loan Details */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Loan Application Details
              </h3>
              <StatusBadge status={app.status} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Application No" value={app.applicationNo} />
              <InfoField label="Loan Type" value={app.loanType} />
              <InfoField label="Principal Amount" value={formatMoney(app.principal)} />
              <InfoField label="Interest Rate" value={`${app.interestRate}%`} />
              <InfoField label="Processing Fee" value={formatMoney(app.processingFee)} />
              <InfoField label="Tenure" value={`${app.tenureCount} installments`} />
              <InfoField label="Installment Amount" value={formatMoney(app.installmentAmount)} />
              <InfoField label="Interest Amount" value={formatMoney(app.interestAmount)} />
              <InfoField label="Total Payable" value={formatMoney(app.totalPayable)} />
              <InfoField label="Start Date" value={fmtDate(app.startDate)} />
              <InfoField label="Maturity Date" value={fmtDate(app.maturityDate)} />
              <InfoField label="Branch" value={`${app.branch.code} - ${app.branch.name}`} />
              {app.purpose && <InfoField label="Purpose" value={app.purpose} />}
              {app.notes && <InfoField label="Notes" value={app.notes} />}
            </div>

            {/* Review info */}
            {app.reviewedBy && (
              <div className="mt-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <InfoField label="Reviewed By" value={app.reviewedBy.name} />
                  <InfoField label="Reviewed At" value={fmtDate(app.reviewedAt)} />
                  {app.reviewRemark && <InfoField label="Review Remark" value={app.reviewRemark} />}
                </div>
              </div>
            )}

            {/* Linked loan account */}
            {app.loanAccount && (
              <div className="mt-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <InfoField
                    label="Loan Account"
                    value={app.loanAccount.accountNo}
                  />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Loan Status</p>
                    <div className="mt-1">
                      <StatusBadge status={app.loanAccount.status} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer - Personal Details */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Customer - Personal Details
              </h3>
              <Link
                href={`/employee/customers/${c.id}`}
                className="text-xs text-primary hover:underline"
              >
                View Full Profile
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Full Name" value={c.fullName} />
              <InfoField label="Customer Code" value={c.customerCode} />
              <InfoField label="Father / Husband" value={c.fatherOrHusband} />
              <InfoField label="Mobile" value={c.mobile} />
              <InfoField label="Alternate Mobile" value={c.altMobile} />
              <InfoField label="Aadhaar Number" value={c.aadhaar} />
              <InfoField label="PAN / Tax ID" value={c.panOrTaxId} />
              <InfoField label="Date of Birth" value={fmtDate(c.dob)} />
              <InfoField label="Gender" value={c.gender} />
              <InfoField label="Marital Status" value={c.maritalStatus} />
              <InfoField label="Occupation" value={c.occupation} />
              <InfoField label="Monthly Income" value={c.monthlyIncome != null ? formatMoney(c.monthlyIncome) : null} />
            </div>
          </CardContent>
        </Card>

        {/* Customer - Address */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Customer - Address
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Current Address" value={c.currentAddress} />
              <InfoField label="Permanent Address" value={c.permanentAddress} />
            </div>
          </CardContent>
        </Card>

        {/* Customer - Guarantor & Reference */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Customer - Guarantor & Reference
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Guarantor Name" value={c.guarantorName} />
              <InfoField label="Guarantor Mobile" value={c.guarantorMobile} />
              <InfoField label="Guarantor Relation" value={c.guarantorRelation} />
              <InfoField label="Reference Name" value={c.referenceName} />
              <InfoField label="Reference Mobile" value={c.referenceMobile} />
            </div>
          </CardContent>
        </Card>

        {/* Customer - Bank & Nominee */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Customer - Bank & Nominee
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Bank Name" value={c.bankName} />
              <InfoField label="Account Number" value={c.bankAccount} />
              <InfoField label="IFSC" value={c.ifsc} />
              <InfoField label="Nominee Name" value={c.nomineeName} />
              <InfoField label="Nominee Relation" value={c.nomineeRelation} />
            </div>
          </CardContent>
        </Card>

        {/* Meta info */}
        <div className="text-xs text-muted-foreground">
          Submitted by {app.createdBy.name} ({app.createdBy.employeeCode}) on{" "}
          {fmtDate(app.createdAt)}
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
