import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import EmployeeApplicationsTable from "./applications-table";

export const dynamic = "force-dynamic";

export default async function EmployeeAppsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const apps = await prisma.loanApplication.findMany({
    where: { createdById: me.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { customer: { select: { fullName: true, mobile: true } } },
  });

  return (
    <div>
      <PageHeader
        title="My Applications"
        description="Loan applications you've submitted"
        actions={
          <Button asChild>
            <Link href="/employee/loan-applications/apply">
              <Plus className="h-4 w-4" /> Apply Loan
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          <EmployeeApplicationsTable apps={apps} />
        </CardContent>
      </Card>
    </div>
  );
}
