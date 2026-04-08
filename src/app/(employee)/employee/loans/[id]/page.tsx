import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import RepaymentSchedule from "@/app/(admin)/admin/loans/[id]/repayment-schedule";
import { LoanCloseButton } from "@/components/ui/loan-close-dialog";

export const dynamic = "force-dynamic";

export default async function EmployeeLoanDetail({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, ...loanScopeWhere(me) },
    include: {
      customer: true,
      schedule: { orderBy: { installmentNo: "asc" } },
    },
  });
  if (!loan) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={loan.accountNo}
        description={`${loan.customer.fullName} · ${loan.loanType}`}
        actions={
          <div className="flex gap-2">
            <LoanCloseButton loanId={loan.id} pendingAmount={Number(loan.pendingAmount)} loanStatus={loan.status} />
            <Button asChild variant="outline"><Link href="/employee/loans">Back</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Principal</p><p className="mt-1 text-xl font-bold">{formatMoney(loan.principal)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Paid</p><p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(loan.paidAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-xl font-bold">{formatMoney(loan.pendingAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Next Due</p><p className="mt-1 text-xl font-bold">{fmtDate(loan.nextDueDate)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
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
    </div>
  );
}
