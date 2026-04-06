import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { scopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsHub } from "@/features/reports/reports-hub";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = scopeWhere(user);

  // Fetch filter options in parallel
  const [branches, employees, customers] = await Promise.all([
    prisma.branch.findMany({
      where: { ...scope, isActive: true, deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.user.findMany({
      where: { ...scope, isActive: true, deletedAt: null, role: "EMPLOYEE" },
      select: { id: true, employeeCode: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { ...scope, deletedAt: null },
      select: { id: true, customerCode: true, fullName: true },
      orderBy: { fullName: "asc" },
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate, preview, and export reports as PDF or Excel"
      />
      <ReportsHub branches={branches} employees={employees} customers={customers} />
    </div>
  );
}
