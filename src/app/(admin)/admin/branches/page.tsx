import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import BranchesTable from "./branches-table";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const branches = await prisma.branch.findMany({
    where: { deletedAt: { isSet: false } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, loans: true, customers: true } } },
  });

  return (
    <div>
      <PageHeader title="Branches" description="Manage company branches" />
      <Card>
        <CardContent className="p-4">
          <BranchesTable branches={branches} />
        </CardContent>
      </Card>
    </div>
  );
}
