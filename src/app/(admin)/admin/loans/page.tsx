import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/admin/loans/${l.id}`} className="hover:underline">{l.accountNo}</Link>
                  </TableCell>
                  <TableCell className="font-medium">{l.customer.fullName}<div className="text-xs text-muted-foreground">{l.customer.mobile}</div></TableCell>
                  <TableCell>{l.loanType}</TableCell>
                  <TableCell>{formatMoney(l.principal)}</TableCell>
                  <TableCell>{formatMoney(l.paidAmount)}</TableCell>
                  <TableCell>{formatMoney(l.pendingAmount)}</TableCell>
                  <TableCell>{fmtDate(l.nextDueDate)}</TableCell>
                  <TableCell>{l.branch.name}</TableCell>
                  <TableCell>{l.assignedEmployee.name}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && (
                <TableRow><TableCell colSpan={10} className="py-12 text-center text-muted-foreground">No loans yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
