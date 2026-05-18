import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import EditLoanShell from "./edit-shell";
import { type InstallmentStatus } from "./schedule-editor";

export const dynamic = "force-dynamic";

export default async function EditLoanAccountPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!isAdmin(me)) redirect(`/admin/loans/${params.id}`);

  const [loan, branches, employees, schedule] = await Promise.all([
    prisma.loanAccount.findUnique({
      where: { id: params.id },
      include: {
        customer: { select: { fullName: true, customerCode: true } },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, deletedAt: { isSet: false } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeCode: true },
    }),
    prisma.repaymentSchedule.findMany({
      where: { loanAccountId: params.id },
      orderBy: { installmentNo: "asc" },
    }),
  ]);
  if (!loan) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${loan.accountNo}`}
        description={`${loan.customer.fullName} · admin override — edits all raw fields`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/loans/${loan.id}`}>Cancel</Link>
          </Button>
        }
      />

      <EditLoanShell
        loan={{
          id: loan.id,
          accountNo: loan.accountNo,
          loanType: loan.loanType,
          principal: Number(loan.principal),
          interestAmount: Number(loan.interestAmount),
          processingFee: Number(loan.processingFee ?? 0),
          totalPayable: Number(loan.totalPayable),
          installmentAmount: Number(loan.installmentAmount),
          paidAmount: Number(loan.paidAmount),
          pendingAmount: Number(loan.pendingAmount),
          overdueAmount: Number(loan.overdueAmount),
          penaltyAmount: Number(loan.penaltyAmount),
          disbursedAt: loan.disbursedAt.toISOString(),
          disbursementMode: loan.disbursementMode,
          startDate: loan.startDate.toISOString(),
          maturityDate: loan.maturityDate.toISOString(),
          nextDueDate: loan.nextDueDate ? loan.nextDueDate.toISOString() : null,
          status: loan.status,
          closedAt: loan.closedAt ? loan.closedAt.toISOString() : null,
          branchId: loan.branchId,
          assignedEmployeeId: loan.assignedEmployeeId,
        }}
        branches={branches}
        employees={employees}
        initialSchedule={schedule.map((s) => ({
          id: s.id,
          installmentNo: s.installmentNo,
          dueDate: s.dueDate.toISOString(),
          dueAmount: Number(s.dueAmount),
          paidAmount: Number(s.paidAmount),
          paidAt: s.paidAt ? s.paidAt.toISOString() : null,
          status: s.status as InstallmentStatus,
          penaltyAmount: Number(s.penaltyAmount),
        }))}
      />
    </div>
  );
}
