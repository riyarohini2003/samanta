import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Installment</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.applicationNo}</TableCell>
                  <TableCell className="font-medium">{a.customer.fullName}</TableCell>
                  <TableCell>{a.loanType}</TableCell>
                  <TableCell>{formatMoney(a.principal)}</TableCell>
                  <TableCell>{formatMoney(a.installmentAmount)}</TableCell>
                  <TableCell>{fmtDate(a.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))}
              {apps.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No applications yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
