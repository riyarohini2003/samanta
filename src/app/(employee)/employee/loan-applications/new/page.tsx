import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { LoanApplicationForm } from "@/features/loans/loan-application-form";

export const dynamic = "force-dynamic";

export default async function EmployeeNewAppPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [customersRaw, branches] = await Promise.all([
    prisma.customer.findMany({
      where: { deletedAt: { isSet: false }, ...scopeWhere(me) },
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
      where: {
        isActive: true,
        deletedAt: { isSet: false },
        ...(me.branchId ? { id: me.branchId } : {}),
      },
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
      <PageHeader title="New Loan Application" description="Submit a loan application for review" />
      <LoanApplicationForm customers={customers} branches={branches} returnTo="/employee/loan-applications" />
    </div>
  );
}
