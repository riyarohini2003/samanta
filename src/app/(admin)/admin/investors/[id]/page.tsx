import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import InvestmentForm from "./investment-form";
import InvestmentActions from "./investment-actions";

export const dynamic = "force-dynamic";

export default async function InvestorDetailPage({ params }: { params: { id: string } }) {
  const investor = await prisma.investor.findFirst({
    where: { id: params.id, deletedAt: { isSet: false } },
    include: {
      investments: { orderBy: { investmentDate: "desc" } },
    },
  });
  if (!investor) notFound();

  const activeInvestments = investor.investments.filter((i) => i.status === "ACTIVE");
  const totalPrincipal = activeInvestments.reduce((s, i) => s + i.principalAmount, 0);
  const totalInterest = activeInvestments.reduce((s, i) => s + i.interestAmount, 0);
  const totalReturn = activeInvestments.reduce((s, i) => s + i.totalReturn, 0);
  const totalPaid = investor.investments.reduce((s, i) => s + i.paidAmount, 0);
  const roi = totalPrincipal > 0 ? ((totalInterest / totalPrincipal) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      <PageHeader
        title={investor.fullName}
        description={`${investor.investorCode} · ${investor.mobile}`}
        actions={<Button asChild variant="outline"><Link href="/admin/investors">Back</Link></Button>}
      />

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Principal</p><p className="mt-1 text-2xl font-bold">{formatMoney(totalPrincipal)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">ROI Payable</p><p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(totalInterest)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Return</p><p className="mt-1 text-2xl font-bold">{formatMoney(totalReturn)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Paid Out</p><p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{formatMoney(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Effective ROI</p><p className="mt-1 text-2xl font-bold">{roi}%</p></CardContent></Card>
      </div>

      {/* Investor details */}
      <Card>
        <CardHeader><CardTitle>Investor Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Row label="Code" value={investor.investorCode} />
          <Row label="Status"><StatusBadge status={investor.isActive ? "ACTIVE" : "CLOSED"} /></Row>
          <Row label="Mobile" value={investor.mobile} />
          <Row label="Email" value={investor.email || "—"} />
          <Row label="PAN" value={investor.pan || "—"} />
          <Row label="Address" value={investor.address || "—"} />
          <Row label="Bank" value={investor.bankName ? `${investor.bankName} · ${investor.bankAccount || "—"}` : "—"} />
          <Row label="IFSC" value={investor.ifsc || "—"} />
          <Row label="Registered" value={fmtDate(investor.createdAt)} />
        </CardContent>
      </Card>

      {/* Add investment */}
      <Card>
        <CardHeader><CardTitle>Add New Investment</CardTitle></CardHeader>
        <CardContent>
          <InvestmentForm investorId={investor.id} />
        </CardContent>
      </Card>

      {/* Investments list */}
      <Card>
        <CardHeader><CardTitle>Investment Records</CardTitle></CardHeader>
        <CardContent>
          {investor.investments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No investments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Code</th>
                    <th className="pb-2 pr-4 font-medium">Principal</th>
                    <th className="pb-2 pr-4 font-medium">Rate (p.a.)</th>
                    <th className="pb-2 pr-4 font-medium">Tenure</th>
                    <th className="pb-2 pr-4 font-medium">Interest (ROI)</th>
                    <th className="pb-2 pr-4 font-medium">Total Return</th>
                    <th className="pb-2 pr-4 font-medium">Paid</th>
                    <th className="pb-2 pr-4 font-medium">Invested</th>
                    <th className="pb-2 pr-4 font-medium">Maturity</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investor.investments.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{inv.investmentCode}</td>
                      <td className="py-3 pr-4 font-semibold">{formatMoney(inv.principalAmount)}</td>
                      <td className="py-3 pr-4">{inv.interestRate}%</td>
                      <td className="py-3 pr-4">{inv.tenureMonths} months</td>
                      <td className="py-3 pr-4 text-amber-600 dark:text-amber-400">{formatMoney(inv.interestAmount)}</td>
                      <td className="py-3 pr-4 font-semibold">{formatMoney(inv.totalReturn)}</td>
                      <td className="py-3 pr-4 text-green-600 dark:text-green-400">{formatMoney(inv.paidAmount)}</td>
                      <td className="py-3 pr-4">{fmtDate(inv.investmentDate)}</td>
                      <td className="py-3 pr-4">{fmtDate(inv.maturityDate)}</td>
                      <td className="py-3 pr-4"><StatusBadge status={inv.status} /></td>
                      <td className="py-3">
                        <InvestmentActions investmentId={inv.id} status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
