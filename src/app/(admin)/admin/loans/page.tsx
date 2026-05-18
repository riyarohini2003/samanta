import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getLoanSerialMap } from "@/server/services/igl-serial";
import LoansTable, { type LoanRow } from "./loans-table";

export const dynamic = "force-dynamic";

export default async function AdminLoansPage({ searchParams }: { searchParams: { status?: string; type?: string } }) {
  const loans = await prisma.loanAccount.findMany({
    where: {
      ...(searchParams.status ? { status: searchParams.status as any } : {}),
      ...(searchParams.type ? { loanType: searchParams.type as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: { select: { customerCode: true, fullName: true, mobile: true } },
      branch: { select: { code: true, name: true } },
      assignedEmployee: { select: { name: true } },
    },
  });

  const serials = await getLoanSerialMap(loans.map((l) => l.id));

  const rows: LoanRow[] = loans.map((l) => ({
    id: l.id,
    accountNo: l.accountNo,
    loanType: l.loanType,
    principal: Number(l.principal),
    paidAmount: Number(l.paidAmount),
    pendingAmount: Number(l.pendingAmount),
    nextDueDate: l.nextDueDate,
    status: l.status,
    customer: l.customer,
    branch: l.branch,
    assignedEmployee: l.assignedEmployee,
    iglSerial: serials.get(l.id),
  }));

  const tabs = [
    { label: "All", q: "" },
    { label: "Daily", q: "type=DAILY" },
    { label: "Weekly", q: "type=WEEKLY" },
    { label: "Monthly", q: "type=MONTHLY" },
    { label: "Active", q: "status=ACTIVE" },
    { label: "Overdue", q: "status=OVERDUE" },
    { label: "Closed", q: "status=CLOSED" },
  ];

  return (
    <div>
      <PageHeader title="Loan Accounts" description="All loan accounts across branches" />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.label} href={t.q ? `?${t.q}` : "?"}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
          >{t.label}</Link>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <LoansTable loans={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
