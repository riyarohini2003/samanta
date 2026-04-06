import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "@/features/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const [customer, branches] = await Promise.all([
    prisma.customer.findFirst({ where: { id: params.id, deletedAt: { isSet: false } } }),
    prisma.branch.findMany({
      where: { deletedAt: { isSet: false }, isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${customer.fullName}`} description={customer.customerCode} />
      <CustomerForm
        branches={branches}
        returnTo="/admin/customers"
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
