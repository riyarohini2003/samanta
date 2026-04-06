import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import EmployeeForm from "../../new/employee-form";

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const [employee, branches] = await Promise.all([
    prisma.user.findFirst({ where: { id: params.id, deletedAt: { isSet: false } } }),
    prisma.branch.findMany({
      where: { deletedAt: { isSet: false }, isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!employee || employee.role === "SUPER_ADMIN") notFound();

  return (
    <div>
      <PageHeader title={`Edit ${employee.name}`} description={employee.employeeCode} />
      <EmployeeForm
        branches={branches}
        initial={{
          id: employee.id,
          name: employee.name,
          loginId: employee.loginId,
          email: employee.email,
          mobile: employee.mobile,
          role: employee.role as "ADMIN" | "BRANCH_MANAGER" | "EMPLOYEE",
          branchId: employee.branchId,
          address: employee.address,
          joiningDate: employee.joiningDate,
          isActive: employee.isActive,
        }}
      />
    </div>
  );
}
