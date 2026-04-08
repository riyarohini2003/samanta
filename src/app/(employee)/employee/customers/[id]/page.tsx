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
import { ArrowLeft, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeCustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, deletedAt: { isSet: false }, ...scopeWhere(me) },
    include: {
      branch: { select: { code: true, name: true } },
      createdBy: { select: { name: true, employeeCode: true } },
      documents: true,
      applications: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          applicationNo: true,
          loanType: true,
          principal: true,
          status: true,
          createdAt: true,
        },
      },
      loans: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          accountNo: true,
          principal: true,
          status: true,
          disbursedAt: true,
        },
      },
    },
  });

  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.fullName}
        description={`Customer Code: ${customer.customerCode}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/employee/customers">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/employee/customers/${customer.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Personal Details */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Personal Details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Full Name" value={customer.fullName} />
              <InfoField label="Father / Husband" value={customer.fatherOrHusband} />
              <InfoField label="Mobile" value={customer.mobile} />
              <InfoField label="Alternate Mobile" value={customer.altMobile} />
              <InfoField label="Aadhaar Number" value={customer.aadhaar} />
              <InfoField label="PAN / Tax ID" value={customer.panOrTaxId} />
              <InfoField label="Date of Birth" value={fmtDate(customer.dob)} />
              <InfoField label="Gender" value={customer.gender} />
              <InfoField label="Marital Status" value={customer.maritalStatus} />
              <InfoField label="Occupation" value={customer.occupation} />
              <InfoField label="Monthly Income" value={customer.monthlyIncome != null ? formatMoney(customer.monthlyIncome) : null} />
              <InfoField label="Branch" value={`${customer.branch.code} - ${customer.branch.name}`} />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Address
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoField label="Current Address" value={customer.currentAddress} />
              <InfoField label="Permanent Address" value={customer.permanentAddress} />
            </div>
          </CardContent>
        </Card>

        {/* Guarantor & Reference */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Guarantor & Reference
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Guarantor Name" value={customer.guarantorName} />
              <InfoField label="Guarantor Mobile" value={customer.guarantorMobile} />
              <InfoField label="Guarantor Relation" value={customer.guarantorRelation} />
              <InfoField label="Reference Name" value={customer.referenceName} />
              <InfoField label="Reference Mobile" value={customer.referenceMobile} />
            </div>
          </CardContent>
        </Card>

        {/* Bank & Nominee */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bank & Nominee
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <InfoField label="Bank Name" value={customer.bankName} />
              <InfoField label="Account Number" value={customer.bankAccount} />
              <InfoField label="IFSC" value={customer.ifsc} />
              <InfoField label="Nominee Name" value={customer.nomineeName} />
              <InfoField label="Nominee Relation" value={customer.nomineeRelation} />
            </div>
          </CardContent>
        </Card>

        {/* Loan Applications */}
        {customer.applications.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Loan Applications
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">App No</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.applications.map((app) => (
                      <tr key={app.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/employee/loan-applications/${app.id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            {app.applicationNo}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{app.loanType}</td>
                        <td className="py-2 pr-4">{formatMoney(app.principal)}</td>
                        <td className="py-2 pr-4">{fmtDate(app.createdAt)}</td>
                        <td className="py-2">
                          <StatusBadge status={app.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Loans */}
        {customer.loans.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Loans
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Account No</th>
                      <th className="pb-2 pr-4 font-medium">Principal</th>
                      <th className="pb-2 pr-4 font-medium">Disbursed</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.loans.map((loan) => (
                      <tr key={loan.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/employee/loans/${loan.id}`}
                            className="font-mono text-xs hover:underline"
                          >
                            {loan.accountNo}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">{formatMoney(loan.principal)}</td>
                        <td className="py-2 pr-4">{fmtDate(loan.disbursedAt)}</td>
                        <td className="py-2">
                          <StatusBadge status={loan.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground">
          Added by {customer.createdBy.name} ({customer.createdBy.employeeCode}) on{" "}
          {fmtDate(customer.createdAt)}
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
