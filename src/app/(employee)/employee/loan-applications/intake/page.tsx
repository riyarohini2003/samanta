import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { CustomerLoanIntake } from "@/features/loans/customer-loan-intake";

export const dynamic = "force-dynamic";

export default async function EmployeeIntakePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.branchId) redirect("/employee/dashboard");

  const branches = await prisma.branch.findMany({
    where: { id: me.branchId, deletedAt: { isSet: false }, isActive: true },
    select: { id: true, code: true, name: true },
  });

  return (
    <div>
      <PageHeader
        title="New Customer Loan Intake"
        description="Capture customer details, photo, documents and loan request in one form"
      />
      <CustomerLoanIntake
        branches={branches}
        defaultBranchId={me.branchId}
        successRedirect="/employee/dashboard"
      />
    </div>
  );
}
