import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { CollectionCenter } from "@/features/collections/collection-center";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const [branches, employees] = await Promise.all([
    prisma.branch.findMany({
      where: { deletedAt: { isSet: false }, isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { deletedAt: { isSet: false }, isActive: true, role: { in: ["EMPLOYEE", "BRANCH_MANAGER"] } },
      select: { id: true, name: true, employeeCode: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Collection Center"
        description="Unified date-wise view of all due customers · daily, weekly & monthly loans in one place"
      />
      <CollectionCenter scope="admin" branches={branches} employees={employees} />
    </div>
  );
}
