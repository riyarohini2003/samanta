import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getSetting } from "@/server/settings";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { PrintActions } from "@/app/(admin)/admin/loan-applications/[id]/print/print-actions";
import "@/app/(admin)/admin/loan-applications/[id]/print/print.css";

export const dynamic = "force-dynamic";

function amountInWords(n: number): string {
  if (n === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (num: number) => num < 10 ? ones[num] : num < 20 ? teens[num - 10] : tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  const three = (num: number) => {
    const h = Math.floor(num / 100); const r = num % 100;
    return (h ? ones[h] + " Hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
  };
  const rupees = Math.floor(Math.abs(n));
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  const parts: string[] = [];
  if (crore) parts.push(two(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (thousand) parts.push(two(thousand) + " Thousand");
  if (rest) parts.push(three(rest));
  return parts.join(" ") + " Rupees Only";
}

const payoutModeLabel: Record<string, string> = {
  MONTHLY_INTEREST: "Monthly Interest Payout",
  MONTHLY_EMI: "Monthly EMI (Principal + Interest)",
  CUSTOM: "Custom Schedule",
};

export default async function InvestmentAgreementPage({
  params,
}: {
  params: { id: string };
}) {
  const [investment, organization] = await Promise.all([
    prisma.investment.findUnique({
      where: { id: params.id },
      include: {
        investor: true,
        payouts: { orderBy: { payoutNo: "asc" } },
      },
    }),
    getSetting("organization"),
  ]);
  if (!investment) notFound();

  const company = organization.companyName || "Samanta Finance";
  const agreementDate = investment.agreementDate || investment.createdAt;

  return (
    <div className="print-root">
      <PrintActions backHref={`/admin/investments/${investment.id}`} />

      {/* PAGE 1 — Agreement */}
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
                <div className="pa-brand-tag">Letter of Agreement</div>
              </div>
            </div>
            <div className="pa-chip pa-chip-APPROVED">
              <span className="pa-chip-dot" />
              {investment.status}
            </div>
          </div>

          <section className="pa-hero">
            <div className="pa-hero-kicker">
              Investment Agreement · {fmtDate(agreementDate)}
            </div>
            <h1 className="pa-hero-title">{investment.investor.fullName}</h1>
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
                <div className="pa-hero-meta-label">Tenure</div>
                <div className="pa-hero-meta-value">{investment.tenureMonths} months</div>
              </div>
              <div className="pa-hero-meta-item">
                <div className="pa-hero-meta-label">Mode</div>
                <div className="pa-hero-meta-value">{payoutModeLabel[investment.payoutMode] ?? investment.payoutMode}</div>
              </div>
            </div>
          </section>

          {/* §01 Parties */}
          <section className="pa-section">
            <div className="pa-section-head">
              <div className="pa-section-num">01</div>
              <div>
                <span className="pa-section-title">Parties</span>
                <span className="pa-section-desc"> · investor &amp; company</span>
              </div>
            </div>
            <div className="pa-fields">
              <div></div>
              <div className="pa-fields-content">
                <Field label="Investor Name" value={investment.investor.fullName} />
                <Field label="Mobile" value={investment.investor.mobile} mono />
                <Field label="Email" value={investment.investor.email} />
                <Field label="PAN" value={investment.investor.pan} mono />
                <Field label="Address" value={investment.investor.address} wide />
                <Field label="Bank" value={investment.investor.bankName} />
                <Field label="Account" value={investment.investor.bankAccount} mono />
                <Field label="IFSC" value={investment.investor.ifsc} mono />
              </div>
            </div>
          </section>

          {/* §02 Principal */}
          <section className="pa-section">
            <div className="pa-section-head">
              <div className="pa-section-num">02</div>
              <div>
                <span className="pa-section-title">Principal &amp; Terms</span>
                <span className="pa-section-desc"> · investment amount and return</span>
              </div>
            </div>
            <div className="pa-amount-block">
              <div>
                <div className="pa-amount-label">Principal Invested</div>
                <div className="pa-amount-value">
                  <span className="pa-amount-accent">₹</span>
                  {Number(investment.principalAmount).toLocaleString("en-IN")}
                </div>
                <div className="pa-amount-sub">{amountInWords(investment.principalAmount)}</div>
              </div>
              <div className="pa-amount-side">
                <div className="pa-amount-side-row highlight">
                  <b>Total Return</b>
                  <span>{formatMoney(investment.totalReturn)}</span>
                </div>
                <div className="pa-amount-side-row">
                  <b>Interest</b>
                  <span>{formatMoney(investment.interestAmount)}</span>
                </div>
                <div className="pa-amount-side-row">
                  <b>Rate</b>
                  <span>{investment.interestRate}% p.a.</span>
                </div>
              </div>
            </div>
            <div className="pa-terms">
              <div></div>
              <div className="pa-terms-grid">
                <TermRow label="Investment Date" value={fmtDate(investment.investmentDate)} />
                <TermRow label="Maturity Date" value={fmtDate(investment.maturityDate)} />
                <TermRow label="Tenure" value={`${investment.tenureMonths} months`} />
                <TermRow label="Payout Mode" value={payoutModeLabel[investment.payoutMode] ?? investment.payoutMode} />
                <TermRow label="# of Payouts" value={String(investment.payouts.length)} />
                <TermRow label="Agreement Date" value={fmtDate(agreementDate)} />
              </div>
            </div>
          </section>

          {/* §03 Terms */}
          <section className="pa-section">
            <div className="pa-section-head">
              <div className="pa-section-num">03</div>
              <div>
                <span className="pa-section-title">Terms &amp; Conditions</span>
                <span className="pa-section-desc"> · agreed between the parties</span>
              </div>
            </div>
            <div className="pa-decl-wrap">
              <div></div>
              <div className="pa-decl">
                <p style={{ margin: 0 }}>
                  This Letter of Agreement is made between <b>{investment.investor.fullName}</b>
                  {" "}(hereinafter the &ldquo;Investor&rdquo;) and <b>{company}</b>
                  {" "}(hereinafter the &ldquo;Company&rdquo;) on {fmtDate(agreementDate)}.
                </p>
                <ol style={{ marginTop: 10, paddingLeft: 16 }}>
                  <li>
                    The Investor has placed a principal sum of{" "}
                    <b>{formatMoney(investment.principalAmount)}</b> with the Company for a
                    tenure of <b>{investment.tenureMonths} months</b> commencing{" "}
                    <b>{fmtDate(investment.investmentDate)}</b> and maturing on{" "}
                    <b>{fmtDate(investment.maturityDate)}</b>.
                  </li>
                  <li>
                    The Company shall pay interest at the rate of{" "}
                    <b>{investment.interestRate}% per annum</b> in the form of{" "}
                    <b>{payoutModeLabel[investment.payoutMode] ?? investment.payoutMode}</b>
                    {" "}as detailed in the Payout Schedule annexed hereto.
                  </li>
                  <li>
                    The total return payable to the Investor over the tenure is{" "}
                    <b>{formatMoney(investment.totalReturn)}</b>, of which{" "}
                    <b>{formatMoney(investment.interestAmount)}</b> represents interest.
                  </li>
                  <li>
                    Payouts shall be remitted to the bank account stated above or such other
                    account as the Investor may notify in writing.
                  </li>
                  <li>
                    Early withdrawal, if permitted, may attract a revision of interest at the
                    sole discretion of the Company. On maturity or upon mutually agreed
                    closure, the Company shall issue a No Objection Certificate (NOC) to the
                    Investor.
                  </li>
                  <li>
                    This Agreement is subject to the jurisdiction of the local courts and
                    governed by applicable laws of India.
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Signatures */}
          <section className="pa-sig-section">
            <div className="pa-sig-row">
              <div className="pa-sig-meta">
                <b>Place</b>
                <span className="pa-sig-meta-fill">&nbsp;</span>
              </div>
              <div className="pa-sig-meta">
                <b>Date</b>
                <span className="pa-sig-meta-fill">{fmtDate(agreementDate)}</span>
              </div>
            </div>
            <div className="pa-signatures">
              <div className="pa-sig">
                <div className="pa-sig-line" />
                <div className="pa-sig-label">Investor</div>
                <div className="pa-sig-name">{investment.investor.fullName}</div>
              </div>
              <div className="pa-sig">
                <div className="pa-sig-line" />
                <div className="pa-sig-label">Witness</div>
                <div className="pa-sig-name">&nbsp;</div>
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
              Investment <b>{investment.investmentCode}</b> · Investor <b>{investment.investor.investorCode}</b>
            </div>
            <div className="pa-footer-mono">
              {company.toUpperCase()} / {fmtDateTime(agreementDate)} / Page 01
            </div>
          </footer>
        </div>
      </div>

      {/* PAGE 2 — Payout schedule annexure */}
      {investment.payouts.length > 0 && (
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
                  <div className="pa-brand-tag">Annexure — Payout Schedule</div>
                </div>
              </div>
              <div className="pa-chip">
                <span className="pa-chip-dot" />
                {payoutModeLabel[investment.payoutMode] ?? investment.payoutMode}
              </div>
            </div>

            <section className="pa-hero">
              <div className="pa-hero-kicker">Schedule of Payouts</div>
              <h1 className="pa-hero-title">Annexure A</h1>
              <div className="pa-hero-meta">
                <div className="pa-hero-meta-item">
                  <div className="pa-hero-meta-label">Investment</div>
                  <div className="pa-hero-meta-value pa-mono">{investment.investmentCode}</div>
                </div>
                <div className="pa-hero-meta-item">
                  <div className="pa-hero-meta-label">Investor</div>
                  <div className="pa-hero-meta-value">{investment.investor.fullName}</div>
                </div>
                <div className="pa-hero-meta-item">
                  <div className="pa-hero-meta-label">Total Return</div>
                  <div className="pa-hero-meta-value">{formatMoney(investment.totalReturn)}</div>
                </div>
              </div>
            </section>

            <section className="pa-section">
              <table className="pa-schedule-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #111827", textAlign: "left" }}>
                    <th style={{ padding: "6px 6px" }}>#</th>
                    <th style={{ padding: "6px 6px" }}>Due Date</th>
                    <th style={{ padding: "6px 6px", textAlign: "right" }}>Principal</th>
                    <th style={{ padding: "6px 6px", textAlign: "right" }}>Interest</th>
                    <th style={{ padding: "6px 6px", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {investment.payouts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "5px 6px", fontFamily: "JetBrains Mono, monospace" }}>{p.payoutNo}</td>
                      <td style={{ padding: "5px 6px" }}>{fmtDate(p.dueDate)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatMoney(p.principalDue)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatMoney(p.interestDue)}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatMoney(p.totalDue)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #111827" }}>
                    <td colSpan={2} style={{ padding: "8px 6px", fontWeight: 700 }}>Total</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>
                      {formatMoney(investment.payouts.reduce((s, p) => s + p.principalDue, 0))}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>
                      {formatMoney(investment.payouts.reduce((s, p) => s + p.interestDue, 0))}
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700 }}>
                      {formatMoney(investment.payouts.reduce((s, p) => s + p.totalDue, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <footer className="pa-footer">
              <div>Annexure to <b>{investment.investmentCode}</b></div>
              <div className="pa-footer-mono">
                {company.toUpperCase()} / {fmtDate(agreementDate)} / Page 02
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  wide?: boolean;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={wide ? "pa-field-wide" : ""} style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <div className="pa-field-label">{label}</div>
      <div className={`pa-field-value${empty ? " empty" : ""}${mono ? " pa-mono" : ""}`}>
        {empty ? "—" : String(value)}
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
