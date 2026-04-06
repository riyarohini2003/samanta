import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { loanScopeWhere, scopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Landmark, Wallet, CheckCircle, FileText } from "lucide-react";
import { toDateOnly } from "@/lib/dayjs";
import { formatMoney, toNumber } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboard() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const today = toDateOnly(new Date());
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [myCustomers, myLoans, myPending, dueToday, collectedToday] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: { isSet: false }, ...scopeWhere(me) } }),
    prisma.loanAccount.count({ where: loanScopeWhere(me) }),
    prisma.loanApplication.count({
      where: { createdById: me.id, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
    prisma.repaymentSchedule.aggregate({
      where: {
        dueDate: today,
        status: { in: ["PENDING", "PARTIAL", "MISSED"] },
        loanAccount: loanScopeWhere(me),
      },
      _sum: { dueAmount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { collectedById: me.id, collectedAt: { gte: startOfDay }, isReversed: false },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${me.name}`} description="Your overview for today" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Customers" value={myCustomers} icon={<Users className="h-6 w-6" />} />
        <StatCard label="My Loans" value={myLoans} icon={<Landmark className="h-6 w-6" />} />
        <StatCard label="Pending Applications" value={myPending} tone="warning" icon={<FileText className="h-6 w-6" />} />
        <StatCard label="Due Today" value={dueToday._count} hint={formatMoney(toNumber(dueToday._sum.dueAmount))} tone="info" icon={<Wallet className="h-6 w-6" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Collected Today"
          value={formatMoney(toNumber(collectedToday._sum.amount))}
          hint={`${collectedToday._count} payments`}
          tone="success"
          icon={<CheckCircle className="h-6 w-6" />}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/employee/collections" className="rounded-md border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Start Today&apos;s Collection
          </Link>
          <Link href="/employee/customers/new" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
            Add New Customer
          </Link>
          <Link href="/employee/loan-applications/apply" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
            Apply Loan
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
