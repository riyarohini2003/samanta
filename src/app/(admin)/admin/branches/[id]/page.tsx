import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function BranchDetailPage({ params }: { params: { id: string } }) {
  const branch = await prisma.branch.findFirst({
    where: { id: params.id, deletedAt: { isSet: false } },
    include: {
      _count: { select: { users: true, loans: true, customers: true, applications: true } },
      users: { where: { deletedAt: { isSet: false } }, take: 10, orderBy: { createdAt: "desc" } },
    },
  });
  if (!branch) notFound();

  const loanStats = await prisma.loanAccount.aggregate({
    where: { branchId: branch.id },
    _sum: { principal: true, paidAmount: true, pendingAmount: true },
    _count: true,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={branch.name}
        description={`${branch.code} · ${branch.city}, ${branch.state}`}
        actions={<Button asChild variant="outline"><Link href="/admin/branches">Back</Link></Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Staff</p><p className="mt-1 text-2xl font-bold">{branch._count.users}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Customers</p><p className="mt-1 text-2xl font-bold">{branch._count.customers}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Active Loans</p><p className="mt-1 text-2xl font-bold">{loanStats._count}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Pending Amount</p><p className="mt-1 text-2xl font-bold">{formatMoney(loanStats._sum.pendingAmount ?? 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Branch Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Row label="Code" value={branch.code} />
          <Row label="Status"><StatusBadge status={branch.isActive ? "ACTIVE" : "CLOSED"} /></Row>
          <Row label="Address" value={branch.address} />
          <Row label="City" value={`${branch.city}, ${branch.state} - ${branch.pincode}`} />
          <Row label="Contact" value={branch.contactNumber} />
          <Row label="Created" value={fmtDate(branch.createdAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Staff</CardTitle></CardHeader>
        <CardContent>
          {branch.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
          ) : (
            <ul className="divide-y">
              {branch.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.employeeCode} · {u.role}</div>
                  </div>
                  <StatusBadge status={u.isActive ? "ACTIVE" : "CLOSED"} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{children ?? value}</div>
    </div>
  );
}
