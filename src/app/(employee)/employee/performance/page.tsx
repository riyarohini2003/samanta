import { redirect } from "next/navigation";
import dayjs from "@/lib/dayjs";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, toNumber } from "@/lib/formatters";
import { fmtDate } from "@/lib/dayjs";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const monthStart = dayjs().startOf("month").toDate();
  const weekStart = dayjs().startOf("week").toDate();
  const startOfDay = dayjs().startOf("day").toDate();

  const [today, week, month, recent] = await Promise.all([
    prisma.payment.aggregate({
      where: { collectedById: me.id, collectedAt: { gte: startOfDay }, isReversed: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { collectedById: me.id, collectedAt: { gte: weekStart }, isReversed: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { collectedById: me.id, collectedAt: { gte: monthStart }, isReversed: false },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { collectedById: me.id, isReversed: false },
      orderBy: { collectedAt: "desc" },
      take: 20,
      include: { loanAccount: { include: { customer: { select: { fullName: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="My Performance" description="Your collection statistics" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Today" value={formatMoney(toNumber(today._sum.amount))} hint={`${today._count} payments`} tone="info" />
        <StatCard label="This Week" value={formatMoney(toNumber(week._sum.amount))} hint={`${week._count} payments`} tone="success" />
        <StatCard label="This Month" value={formatMoney(toNumber(month._sum.amount))} hint={`${month._count} payments`} tone="success" />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Collections</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                  <TableCell>{p.loanAccount.customer.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{p.loanAccount.accountNo}</TableCell>
                  <TableCell>{fmtDate(p.collectedAt)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(p.amount)}</TableCell>
                  <TableCell>{p.mode}</TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No collections yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
