import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { ExistingCustomerLoan } from "@/features/loans/existing-customer-loan";

export const dynamic = "force-dynamic";

export default async function ExistingCustomerLoanPage() {
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
      <PageHeader
        title="Existing Customer Loan"
        description="Search for an existing customer, review their profile and apply for an eligible loan type"
      />
      <ExistingCustomerLoan
        customers={customers}
        branches={branches}
        returnTo="/admin/loan-applications"
      />
    </div>
  );
}
