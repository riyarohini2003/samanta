import { redirect, notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "@/features/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function EmployeeEditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.branchId) redirect("/employee/dashboard");

  const [customer, branches] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: params.id, deletedAt: { isSet: false }, ...scopeWhere(me) },
    }),
    prisma.branch.findMany({
      where: { id: me.branchId, deletedAt: { isSet: false }, isActive: true },
      select: { id: true, code: true, name: true },
    }),
  ]);

  if (!customer) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${customer.fullName}`} description={customer.customerCode} />
      <CustomerForm
        branches={branches}
        defaultBranchId={me.branchId}
        returnTo={`/employee/customers/${customer.id}`}
        initial={{
          id: customer.id,
          fullName: customer.fullName,
          fatherOrHusband: customer.fatherOrHusband,
          mobile: customer.mobile,
          altMobile: customer.altMobile,
          aadhaar: customer.aadhaar,
          panOrTaxId: customer.panOrTaxId,
          dob: customer.dob,
          gender: customer.gender,
          maritalStatus: customer.maritalStatus,
          occupation: customer.occupation,
          monthlyIncome: customer.monthlyIncome,
          currentAddress: customer.currentAddress,
          permanentAddress: customer.permanentAddress,
          guarantorName: customer.guarantorName,
          guarantorMobile: customer.guarantorMobile,
          guarantorRelation: customer.guarantorRelation,
          referenceName: customer.referenceName,
          referenceMobile: customer.referenceMobile,
          bankName: customer.bankName,
          bankAccount: customer.bankAccount,
          ifsc: customer.ifsc,
          nomineeName: customer.nomineeName,
          nomineeRelation: customer.nomineeRelation,
          branchId: customer.branchId,
        }}
      />
    </div>
  );
}
