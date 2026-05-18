import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { FundBalanceView } from "@/features/reports/fund-balance-view";
import { getFundBreakdown, getFundLedger } from "@/server/services/fund-balance-service";

export const dynamic = "force-dynamic";

export default async function FundBalanceReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "EMPLOYEE") redirect("/admin/dashboard");

  const [breakdown, ledger] = await Promise.all([
    getFundBreakdown(),
    getFundLedger(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Our Fund With Us"
        description="Cash balance from investor capital and collections, minus disbursements and payouts"
      />
      <FundBalanceView initialBreakdown={breakdown} initialLedger={serialize(ledger)} />
    </div>
  );
}

function serialize<T extends { date: Date }>(rows: T[]) {
  return rows.map((r) => ({ ...r, date: r.date.toISOString() }));
}
