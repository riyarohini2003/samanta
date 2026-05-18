import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { FileText, ShieldCheck } from "lucide-react";
import PayoutRowActions from "./payout-row-actions";
import InvestmentActions from "../../investors/[id]/investment-actions";

export const dynamic = "force-dynamic";

const payoutModeLabel: Record<string, string> = {
  MONTHLY_INTEREST: "Monthly Interest",
  MONTHLY_EMI: "Monthly EMI",
  CUSTOM: "Custom Schedule",
};

export default async function InvestmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const investment = await prisma.investment.findUnique({
    where: { id: params.id },
    include: {
      investor: true,
      payouts: { orderBy: { payoutNo: "asc" } },
    },
  });
  if (!investment) notFound();

  const principalPaid = investment.payouts
    .filter((p) => p.status === "PAID" || p.status === "PARTIAL")
    .reduce((s, p) => s + p.principalDue * (p.paidAmount / Math.max(p.totalDue, 0.01)), 0);
  const paidTotal = investment.payouts.reduce((s, p) => s + p.paidAmount, 0);
  const pendingTotal = investment.payouts
    .filter((p) => p.status !== "PAID" && p.status !== "SKIPPED")
    .reduce((s, p) => s + (p.totalDue - p.paidAmount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Investment ${investment.investmentCode}`}
        description={`${investment.investor.fullName} · ${investment.investor.investorCode}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/investors/${investment.investorId}`}>Back</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/investments/${investment.id}/agreement`}>
                <FileText className="mr-1 h-4 w-4" /> Letter of Agreement
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/investments/${investment.id}/noc`}>
                <ShieldCheck className="mr-1 h-4 w-4" /> NOC
              </Link>
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Principal</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(investment.principalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Interest @ {investment.interestRate}% p.a.</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(investment.interestAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Return</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(investment.totalReturn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Paid Out</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatMoney(paidTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatMoney(pendingTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Row label="Status"><StatusBadge status={investment.status} /></Row>
          <Row label="Payout Mode" value={payoutModeLabel[investment.payoutMode] ?? investment.payoutMode} />
          <Row label="Tenure" value={`${investment.tenureMonths} months`} />
          <Row label="Investment Date" value={fmtDate(investment.investmentDate)} />
          <Row label="Maturity Date" value={fmtDate(investment.maturityDate)} />
          <Row label="Agreement Date" value={investment.agreementDate ? fmtDate(investment.agreementDate) : "—"} />
          <Row label="Closed At" value={investment.closedAt ? fmtDate(investment.closedAt) : "—"} />
          <Row label="NOC Issued" value={investment.nocIssuedAt ? fmtDate(investment.nocIssuedAt) : "—"} />
          {investment.notes && <Row label="Notes" value={investment.notes} />}
          {investment.status === "ACTIVE" && (
            <div className="md:col-span-4 flex justify-end">
              <InvestmentActions investmentId={investment.id} status={investment.status} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {investment.payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts scheduled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">Due Date</th>
                    <th className="pb-2 pr-4 font-medium">Principal</th>
                    <th className="pb-2 pr-4 font-medium">Interest</th>
                    <th className="pb-2 pr-4 font-medium">Total Due</th>
                    <th className="pb-2 pr-4 font-medium">Paid</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Paid On</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investment.payouts.map((p) => {
                    const remaining = Math.max(0, p.totalDue - p.paidAmount);
                    return (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">{p.payoutNo}</td>
                        <td className="py-2 pr-4">{fmtDate(p.dueDate)}</td>
                        <td className="py-2 pr-4">{formatMoney(p.principalDue)}</td>
                        <td className="py-2 pr-4 text-amber-600 dark:text-amber-400">
                          {formatMoney(p.interestDue)}
                        </td>
                        <td className="py-2 pr-4 font-semibold">{formatMoney(p.totalDue)}</td>
                        <td className="py-2 pr-4 text-green-600 dark:text-green-400">
                          {formatMoney(p.paidAmount)}
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="py-2 pr-4">{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                        <td className="py-2">
                          <PayoutRowActions
                            investmentId={investment.id}
                            payoutId={p.id}
                            status={p.status}
                            remaining={remaining}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{children ?? value}</div>
    </div>
  );
}
