import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import EmployeesTable from "./employees-table";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await prisma.user.findMany({
    where: { deletedAt: { isSet: false }, role: { not: "SUPER_ADMIN" } },
    orderBy: { createdAt: "desc" },
    include: { branch: { select: { code: true, name: true } } },
  });

  return (
    <div>
      <PageHeader title="Employees" description="Manage staff accounts and logins" />
      <Card>
        <CardContent className="p-4">
          <EmployeesTable employees={employees} />
        </CardContent>
      </Card>
    </div>
  );
}
