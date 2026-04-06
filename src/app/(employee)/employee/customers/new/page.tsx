import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerForm } from "@/features/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function EmployeeNewCustomerPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.branchId) redirect("/employee/dashboard");

  const branches = await prisma.branch.findMany({
    where: { id: me.branchId, deletedAt: { isSet: false }, isActive: true },
    select: { id: true, code: true, name: true },
  });

  return (
    <div>
      <PageHeader title="New Customer" description="Add a customer to your branch" />
      <CustomerForm branches={branches} defaultBranchId={me.branchId} returnTo="/employee/customers" />
    </div>
  );
}
