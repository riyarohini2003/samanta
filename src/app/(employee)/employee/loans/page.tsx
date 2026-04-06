import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function EmployeeLoansPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const loans = await prisma.loanAccount.findMany({
    where: loanScopeWhere(me),
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { customer: { select: { fullName: true, mobile: true } } },
  });

  return (
    <div>
      <PageHeader title="My Loans" description="Loan accounts assigned to you" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs"><Link href={`/employee/loans/${l.id}`} className="hover:underline">{l.accountNo}</Link></TableCell>
                  <TableCell className="font-medium">{l.customer.fullName}<div className="text-xs text-muted-foreground">{l.customer.mobile}</div></TableCell>
                  <TableCell>{l.loanType}</TableCell>
                  <TableCell>{formatMoney(l.principal)}</TableCell>
                  <TableCell>{formatMoney(l.pendingAmount)}</TableCell>
                  <TableCell>{fmtDate(l.nextDueDate)}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No loans assigned yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
