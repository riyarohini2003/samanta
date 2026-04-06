import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import CustomersTable from "./customers-table";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: { isSet: false } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      branch: { select: { code: true, name: true } },
      _count: { select: { loans: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Customers" description="All customers across branches" />
      <Card>
        <CardContent className="p-4">
          <CustomersTable customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
