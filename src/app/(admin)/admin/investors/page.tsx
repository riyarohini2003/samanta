import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/formatters";
import { TrendingUp, IndianRupee, Users, PiggyBank } from "lucide-react";
import InvestorsTable from "./investors-table";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  const investors = await prisma.investor.findMany({
    where: { deletedAt: { isSet: false } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { investments: true } },
      investments: {
        select: { principalAmount: true, interestAmount: true, totalReturn: true, paidAmount: true, status: true },
      },
    },
  });

  // Build table data with computed summaries
  const tableData = investors.map((inv) => {
    const activeInvestments = inv.investments.filter((i) => i.status === "ACTIVE");
    const totalPrincipal = activeInvestments.reduce((s, i) => s + i.principalAmount, 0);
    const totalInterest = activeInvestments.reduce((s, i) => s + i.interestAmount, 0);
    const totalReturn = activeInvestments.reduce((s, i) => s + i.totalReturn, 0);
    const totalPaid = inv.investments.reduce((s, i) => s + i.paidAmount, 0);
    const { investments: _, ...rest } = inv;
    return { ...rest, totalPrincipal, totalInterest, totalReturn, totalPaid };
  });

  // Page-level stats
  const allInvestments = investors.flatMap((i) => i.investments);
  const activeInvestments = allInvestments.filter((i) => i.status === "ACTIVE");
  const grandPrincipal = activeInvestments.reduce((s, i) => s + i.principalAmount, 0);
  const grandInterest = activeInvestments.reduce((s, i) => s + i.interestAmount, 0);
  const grandReturn = activeInvestments.reduce((s, i) => s + i.totalReturn, 0);
  const grandPaid = allInvestments.reduce((s, i) => s + i.paidAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Investors" description="Manage company investors and their investments" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Investors"
          value={investors.length}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          label="Total Principal"
          value={formatMoney(grandPrincipal)}
          hint={`${activeInvestments.length} active investments`}
          tone="info"
          icon={<IndianRupee className="h-6 w-6" />}
        />
        <StatCard
          label="Total ROI Payable"
          value={formatMoney(grandInterest)}
          hint={grandPrincipal > 0 ? `${((grandInterest / grandPrincipal) * 100).toFixed(1)}% avg ROI` : "No active investments"}
          tone="warning"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          label="Total Paid Out"
          value={formatMoney(grandPaid)}
          hint={`${formatMoney(grandReturn - grandPaid)} remaining`}
          tone="success"
          icon={<PiggyBank className="h-6 w-6" />}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <InvestorsTable investors={tableData} />
        </CardContent>
      </Card>
    </div>
  );
}
