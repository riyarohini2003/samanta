import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { getApplicationSerialMap } from "@/server/services/igl-serial";
import ApplicationsTable from "./applications-table";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status;
  const apps = await prisma.loanApplication.findMany({
    where: { ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { id: true, customerCode: true, fullName: true, mobile: true } },
      branch: { select: { code: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  const serials = await getApplicationSerialMap(apps.map((a) => a.id));
  const appsWithSerial = apps.map((a) => ({
    ...a,
    iglSerial: serials.get(a.id) ?? 0,
  }));

  const tabs = [
    { label: "All", value: "" },
    { label: "Pending", value: "SUBMITTED" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Disbursed", value: "DISBURSED" },
  ];

  return (
    <div>
      <PageHeader
        title="Loan Applications"
        description="Review and act on loan applications"
        actions={
          <Button asChild>
            <Link href="/admin/loan-applications/apply">
              <Plus className="h-4 w-4" /> Apply Loan
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = (status ?? "") === t.value;
          return (
            <Link
              key={t.value || "all"}
              href={t.value ? `?status=${t.value}` : "?"}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <ApplicationsTable apps={appsWithSerial} />
        </CardContent>
      </Card>
    </div>
  );
}
