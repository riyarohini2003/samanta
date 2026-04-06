import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import EmployeeCustomersTable from "./customers-table";

export const dynamic = "force-dynamic";

export default async function EmployeeCustomersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const customers = await prisma.customer.findMany({
    where: { deletedAt: { isSet: false }, ...scopeWhere(me) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { loans: true } } },
  });

  return (
    <div>
      <PageHeader title="My Customers" description="Customers in your branch" />
      <Card>
        <CardContent className="p-4">
          <EmployeeCustomersTable customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
