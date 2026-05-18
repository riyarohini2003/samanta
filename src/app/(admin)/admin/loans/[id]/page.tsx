import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { IglBadge } from "@/components/ui/igl-badge";
import { getLoanSerial } from "@/server/services/igl-serial";
import { Pencil } from "lucide-react";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import RepaymentSchedule from "./repayment-schedule";
import PaymentHistory from "./payment-history";
import { LoanCloseButton } from "@/components/ui/loan-close-dialog";

export const dynamic = "force-dynamic";

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  const canEdit = me ? isAdmin(me) : false;
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

  const iglSerial = await getLoanSerial(loan.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {loan.accountNo}
            <IglBadge serial={iglSerial} />
          </span>
        }
        description={`${loan.customer.fullName} · ${loan.loanType} · ${loan.branch.name}`}
        actions={
          <div className="flex gap-2">
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/admin/loans/${loan.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
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
          <PaymentHistory
            canEdit={canEdit}
            payments={loan.payments.map((p) => ({
              id: p.id,
              receiptNo: p.receiptNo,
              collectedAt: p.collectedAt.toISOString(),
              amount: Number(p.amount),
              penalty: Number(p.penalty),
              mode: p.mode,
              collectedByName: p.collectedBy.name,
              note: p.note,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
