import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerLoanIntake } from "@/features/loans/customer-loan-intake";

export const dynamic = "force-dynamic";

export default async function AdminIntakePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const branches = await prisma.branch.findMany({
    where: { deletedAt: { isSet: false }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div>
      <PageHeader
        title="New Customer Loan Intake"
        description="Create a new customer and their first loan application in one go"
      />
      <CustomerLoanIntake
        branches={branches}
        defaultBranchId={me.branchId ?? branches[0]?.id}
        successRedirect="/admin/dashboard"
      />
    </div>
  );
}
