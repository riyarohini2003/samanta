import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { IglBadge } from "@/components/ui/igl-badge";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const c = await prisma.customer.findFirst({
    where: { id: params.id, deletedAt: { isSet: false } },
    include: {
      branch: true,
      loans: { orderBy: { createdAt: "desc" } },
      applications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();

  // Build IGL serials: loans are ordered desc above, so serial = total - index.
  const totalLoans = c.loans.length;
  const loanSerial = (idx: number) => totalLoans - idx;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.fullName}
        description={`${c.customerCode} · ${c.mobile} · ${c.branch.name}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/admin/customers">Back</Link></Button>
            <Button asChild><Link href={`/admin/loan-applications/new?customerId=${c.id}`}>New Loan Application</Link></Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>KYC Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Row label="Father / Husband" value={c.fatherOrHusband ?? "—"} />
            <Row label="Date of Birth" value={fmtDate(c.dob)} />
            <Row label="Gender" value={c.gender ?? "—"} />
            <Row label="Marital Status" value={c.maritalStatus ?? "—"} />
            <Row label="Aadhaar" value={c.aadhaar ?? "—"} />
            <Row label="PAN" value={c.panOrTaxId ?? "—"} />
            <Row label="Occupation" value={c.occupation ?? "—"} />
            <Row label="Monthly Income" value={c.monthlyIncome ? formatMoney(c.monthlyIncome) : "—"} />
            <Row label="Current Address" value={c.currentAddress} wide />
            <Row label="Permanent Address" value={c.permanentAddress ?? "—"} wide />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Guarantor & Bank</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Guarantor" value={c.guarantorName ? `${c.guarantorName} (${c.guarantorRelation ?? "-"}) · ${c.guarantorMobile ?? ""}` : "—"} />
            <Row label="Reference" value={c.referenceName ? `${c.referenceName} · ${c.referenceMobile ?? ""}` : "—"} />
            <Row label="Bank" value={c.bankName ? `${c.bankName} · ${c.bankAccount ?? ""}` : "—"} />
            <Row label="IFSC" value={c.ifsc ?? "—"} />
            <Row label="Nominee" value={c.nomineeName ? `${c.nomineeName} (${c.nomineeRelation ?? "-"})` : "—"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Loans</CardTitle></CardHeader>
        <CardContent>
          {c.loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loans yet.</p>
          ) : (
            <ul className="divide-y">
              {c.loans.map((l, idx) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/loans/${l.id}`} className="font-mono text-sm font-medium hover:underline">{l.accountNo}</Link>
                      <IglBadge serial={loanSerial(idx)} />
                    </div>
                    <div className="text-xs text-muted-foreground">{l.loanType} · {formatMoney(l.principal)} · due {fmtDate(l.nextDueDate)}</div>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
        <CardContent>
          {c.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="divide-y">
              {c.applications.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/admin/loan-applications/${a.id}`} className="font-mono text-sm font-medium hover:underline">{a.applicationNo}</Link>
                    <div className="text-xs text-muted-foreground">{a.loanType} · {formatMoney(a.principal)} · {fmtDate(a.createdAt)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
