import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getLoanSerialMap } from "@/server/services/igl-serial";
import { requireUser } from "@/server/auth/session";
import { isAdmin, loanScopeWhere } from "@/server/auth/guards";
import type { LoanStatus, LoanType, Prisma } from "@prisma/client";
import LoansTable, { type LoanRow } from "./loans-table";
import LoansFilters, { type FilterOption } from "./loans-filters";

export const dynamic = "force-dynamic";

const VALID_STATUS: LoanStatus[] = ["ACTIVE", "OVERDUE", "CLOSED"];
const VALID_TYPE: LoanType[] = ["DAILY", "WEEKLY", "MONTHLY"];

function parseCsv(v: string | undefined): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function AdminLoansPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    type?: string;
    branch?: string;
    officer?: string;
  };
}) {
  const me = await requireUser();

  const statuses = parseCsv(searchParams.status).filter((s): s is LoanStatus =>
    VALID_STATUS.includes(s as LoanStatus),
  );
  const types = parseCsv(searchParams.type).filter((t): t is LoanType =>
    VALID_TYPE.includes(t as LoanType),
  );
  const branchIds = parseCsv(searchParams.branch);
  const officerIds = parseCsv(searchParams.officer);

  const where: Prisma.LoanAccountWhereInput = {
    ...loanScopeWhere(me),
    ...(statuses.length ? { status: { in: statuses } } : {}),
    ...(types.length ? { loanType: { in: types } } : {}),
    ...(branchIds.length ? { branchId: { in: branchIds } } : {}),
    ...(officerIds.length ? { assignedEmployeeId: { in: officerIds } } : {}),
  };

  const [loans, branchRows, officerRows] = await Promise.all([
    prisma.loanAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { customerCode: true, fullName: true, mobile: true, fatherOrHusband: true } },
        branch: { select: { code: true, name: true } },
        assignedEmployee: { select: { name: true } },
      },
    }),
    // Branch options — admins see all, others see only their own branch
    isAdmin(me)
      ? prisma.branch.findMany({
          where: { isActive: true, deletedAt: { isSet: false } },
          select: { id: true, code: true, name: true },
          orderBy: { code: "asc" },
        })
      : me.branchId
        ? prisma.branch.findMany({
            where: { id: me.branchId },
            select: { id: true, code: true, name: true },
          })
        : Promise.resolve([]),
    // Officer options — admins see everyone, BM sees own branch, employees see only self
    me.role === "EMPLOYEE"
      ? prisma.user.findMany({
          where: { id: me.id },
          select: { id: true, name: true, employeeCode: true },
        })
      : prisma.user.findMany({
          where: {
            isActive: true,
            deletedAt: { isSet: false },
            role: { in: ["EMPLOYEE", "BRANCH_MANAGER", "ADMIN", "SUPER_ADMIN"] },
            ...(isAdmin(me) ? {} : me.branchId ? { branchId: me.branchId } : { id: "__none__" }),
          },
          select: { id: true, name: true, employeeCode: true },
          orderBy: { employeeCode: "asc" },
        }),
  ]);

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

  const filterOptions: {
    statuses: FilterOption[];
    types: FilterOption[];
    branches: FilterOption[];
    officers: FilterOption[];
  } = {
    statuses: [
      { value: "ACTIVE", label: "Active" },
      { value: "OVERDUE", label: "Overdue" },
      { value: "CLOSED", label: "Closed" },
    ],
    types: [
      { value: "DAILY", label: "Daily" },
      { value: "WEEKLY", label: "Weekly" },
      { value: "MONTHLY", label: "Monthly" },
    ],
    branches: branchRows.map((b) => ({
      value: b.id,
      label: `${b.code} — ${b.name}`,
    })),
    officers: officerRows.map((u) => ({
      value: u.id,
      label: u.employeeCode ? `${u.employeeCode} — ${u.name}` : u.name,
    })),
  };

  return (
    <div>
      <PageHeader title="Loan Accounts" description="All loan accounts across branches" />
      <LoansFilters
        statuses={statuses}
        types={types}
        branchIds={branchIds}
        officerIds={officerIds}
        options={filterOptions}
      />
      <Card>
        <CardContent className="p-0">
          <LoansTable loans={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
