import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import EmployeeForm from "./employee-form";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const branches = await prisma.branch.findMany({
    where: { deletedAt: { isSet: false }, isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="New Employee" description="Create employee account and login" />
      <EmployeeForm branches={branches} />
    </div>
  );
}
