import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getSetting } from "@/server/settings";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { PrintActions } from "@/app/(admin)/admin/loan-applications/[id]/print/print-actions";
import "@/app/(admin)/admin/loan-applications/[id]/print/print.css";

export const dynamic = "force-dynamic";

export default async function InvestmentNocPage({
  params,
}: {
  params: { id: string };
}) {
  const [investment, organization] = await Promise.all([
    prisma.investment.findUnique({
      where: { id: params.id },
      include: { investor: true, payouts: true },
    }),
    getSetting("organization"),
  ]);
  if (!investment) notFound();

  // Stamp the issuance the first time this page is generated.  We deliberately
  // do not block re-printing — just record when NOC was first cut.
  let nocIssuedAt = investment.nocIssuedAt;
  if (!nocIssuedAt) {
    const updated = await prisma.investment.update({
      where: { id: investment.id },
      data: { nocIssuedAt: new Date() },
      select: { nocIssuedAt: true },
    });
    nocIssuedAt = updated.nocIssuedAt;
  }
  const issuedAt = nocIssuedAt ?? new Date();

  const company = organization.companyName || "Samanta Finance";
  const totalPaid = investment.payouts.reduce((s, p) => s + p.paidAmount, 0);
  const balance = Math.max(0, investment.totalReturn - totalPaid);
  const fullySettled = balance < 0.5;

  return (
    <div className="print-root">
      <PrintActions backHref={`/admin/investments/${investment.id}`} />

      <div className="a4-page">
        <div className="a4-inner">
          <div className="pa-top">
            <div className="pa-brand">
              <div className="pa-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt={`${company} logo`} />
              </div>
              <div>
                <div className="pa-brand-name">{company}</div>
                <div className="pa-brand-tag">No Objection Certificate</div>
              </div>
            </div>
            <div className="pa-chip pa-chip-APPROVED">
              <span className="pa-chip-dot" />
              ISSUED
            </div>
          </div>

          <section className="pa-hero">
            <div className="pa-hero-kicker">No Objection Certificate · {fmtDate(issuedAt)}</div>
            <h1 className="pa-hero-title">NOC</h1>
            <div className="pa-hero-meta">
              <div className="pa-hero-meta-item">
                <div className="pa-hero-meta-label">Investment</div>
                <div className="pa-hero-meta-value pa-mono">{investment.investmentCode}</div>
              </div>
              <div className="pa-hero-meta-item">
                <div className="pa-hero-meta-label">Investor</div>
                <div className="pa-hero-meta-value pa-mono">{investment.investor.investorCode}</div>
              </div>
              <div className="pa-hero-meta-item">
                <div className="pa-hero-meta-label">Issued On</div>
                <div className="pa-hero-meta-value">{fmtDate(issuedAt)}</div>
              </div>
            </div>
          </section>

          <section className="pa-section">
            <div className="pa-decl-wrap">
              <div></div>
              <div className="pa-decl">
                <p style={{ margin: 0 }}>
                  To Whom It May Concern,
                </p>
                <p style={{ marginTop: 10 }}>
                  This is to certify that <b>{investment.investor.fullName}</b>
                  {investment.investor.pan ? <> (PAN <span className="pa-mono">{investment.investor.pan}</span>)</> : null},
                  residing at <b>{investment.investor.address || "—"}</b>, had placed an
                  investment of <b>{formatMoney(investment.principalAmount)}</b> with{" "}
                  <b>{company}</b> under investment reference{" "}
                  <span className="pa-mono"><b>{investment.investmentCode}</b></span>
                  {" "}dated <b>{fmtDate(investment.investmentDate)}</b> for a tenure of{" "}
                  <b>{investment.tenureMonths} months</b> at{" "}
                  <b>{investment.interestRate}% p.a.</b>
                </p>
                <p style={{ marginTop: 10 }}>
                  As of <b>{fmtDate(issuedAt)}</b>, the investment stands{" "}
                  <b>{investment.status === "ACTIVE" ? "OPEN" : investment.status}</b>{" "}
                  with total return of <b>{formatMoney(investment.totalReturn)}</b> against
                  which <b>{formatMoney(totalPaid)}</b> has been disbursed and{" "}
                  <b>{formatMoney(balance)}</b> remains outstanding.
                </p>
                {fullySettled ? (
                  <p style={{ marginTop: 10 }}>
                    The Company has no objection in releasing the investor from all further
                    obligations under this investment, all dues having been settled. This
                    NOC supersedes the Letter of Agreement insofar as the obligations of the
                    Company are concerned.
                  </p>
                ) : (
                  <p style={{ marginTop: 10 }}>
                    The Company issues this certificate to record the current standing of
                    the investment. Any outstanding balance shall continue to be governed
                    by the Letter of Agreement until full settlement.
                  </p>
                )}
                <p style={{ marginTop: 10 }}>
                  This certificate is issued at the request of the Investor for record
                  purposes.
                </p>
              </div>
            </div>
          </section>

          <section className="pa-section">
            <div className="pa-section-head">
              <div className="pa-section-num">§</div>
              <div>
                <span className="pa-section-title">Settlement Summary</span>
              </div>
            </div>
            <div className="pa-terms">
              <div></div>
              <div className="pa-terms-grid">
                <TermRow label="Principal" value={formatMoney(investment.principalAmount)} />
                <TermRow label="Interest" value={formatMoney(investment.interestAmount)} />
                <TermRow label="Total Return" value={formatMoney(investment.totalReturn)} />
                <TermRow label="Paid Out" value={formatMoney(totalPaid)} />
                <TermRow label="Balance" value={formatMoney(balance)} />
                <TermRow label="Status" value={investment.status} />
                <TermRow label="Closed On" value={investment.closedAt ? fmtDate(investment.closedAt) : "—"} />
                <TermRow label="Maturity Date" value={fmtDate(investment.maturityDate)} />
              </div>
            </div>
          </section>

          <section className="pa-sig-section">
            <div className="pa-sig-row">
              <div className="pa-sig-meta">
                <b>Place</b>
                <span className="pa-sig-meta-fill">&nbsp;</span>
              </div>
              <div className="pa-sig-meta">
                <b>Date</b>
                <span className="pa-sig-meta-fill">{fmtDate(issuedAt)}</span>
              </div>
            </div>
            <div className="pa-signatures">
              <div className="pa-sig" style={{ gridColumn: "1 / span 2" }}>
                <div className="pa-sig-line" />
                <div className="pa-sig-label">Investor (Acknowledgement)</div>
                <div className="pa-sig-name">{investment.investor.fullName}</div>
              </div>
              <div className="pa-sig">
                <div className="pa-sig-line" />
                <div className="pa-sig-label">For {company}</div>
                <div className="pa-sig-name">Authorized Signatory</div>
              </div>
            </div>
          </section>

          <footer className="pa-footer">
            <div>
              NOC · Investment <b>{investment.investmentCode}</b>
            </div>
            <div className="pa-footer-mono">
              {company.toUpperCase()} / {fmtDateTime(issuedAt)} / Page 01
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pa-term-row">
      <b>{label}</b>
      <span>{value}</span>
    </div>
  );
}
