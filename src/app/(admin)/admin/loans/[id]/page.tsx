import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import RepaymentSchedule from "./repayment-schedule";
import { LoanCloseButton } from "@/components/ui/loan-close-dialog";

export const dynamic = "force-dynamic";

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const loan = await prisma.loanAccount.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      branch: true,
      assignedEmployee: { select: { name: true, employeeCode: true } },
      schedule: { orderBy: { installmentNo: "asc" } },
      payments: { orderBy: { collectedAt: "desc" }, include: { collectedBy: { select: { name: true } } } },
    },
  });
  if (!loan) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={loan.accountNo}
        description={`${loan.customer.fullName} · ${loan.loanType} · ${loan.branch.name}`}
        actions={
          <div className="flex gap-2">
            <LoanCloseButton loanId={loan.id} pendingAmount={Number(loan.pendingAmount)} loanStatus={loan.status} />
            <Button asChild variant="outline"><Link href="/admin/loans">Back</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Principal</p><p className="mt-1 text-xl font-bold">{formatMoney(loan.principal)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Payable</p><p className="mt-1 text-xl font-bold">{formatMoney(loan.totalPayable)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Paid</p><p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(loan.paidAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-xl font-bold">{formatMoney(loan.pendingAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Overdue</p><p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">{formatMoney(loan.overdueAmount)}</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={loan.status} />
        <span className="text-sm text-muted-foreground">
          Disbursed {fmtDate(loan.disbursedAt)} · Next due {fmtDate(loan.nextDueDate)} · Officer {loan.assignedEmployee.name}
        </span>
      </div>

      <Card>
        <CardHeader><CardTitle>Repayment Schedule</CardTitle></CardHeader>
        <CardContent className="p-0">
          <RepaymentSchedule
            loanAccountId={loan.id}
            loanStatus={loan.status}
            schedule={loan.schedule.map((s) => ({
              id: s.id,
              installmentNo: s.installmentNo,
              dueDate: s.dueDate.toISOString(),
              dueAmount: Number(s.dueAmount),
              paidAmount: Number(s.paidAmount),
              status: s.status,
              paidAt: s.paidAt ? s.paidAt.toISOString() : null,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                  <TableCell>{fmtDateTime(p.collectedAt)}</TableCell>
                  <TableCell>{formatMoney(p.amount)}</TableCell>
                  <TableCell>{p.mode}</TableCell>
                  <TableCell>{p.collectedBy.name}</TableCell>
                  <TableCell>{p.note ?? "—"}</TableCell>
                </TableRow>
              ))}
              {loan.payments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No payments yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
