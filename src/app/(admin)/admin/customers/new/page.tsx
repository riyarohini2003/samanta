import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "@/features/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const branches = await prisma.branch.findMany({
    where: { deletedAt: { isSet: false }, isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="New Customer" description="Add customer KYC details" />
      <CustomerForm branches={branches} returnTo="/admin/customers" />
    </div>
  );
}
