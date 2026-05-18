import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getSetting } from "@/server/settings";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { PrintActions } from "./print-actions";
import "./print.css";

export const dynamic = "force-dynamic";

function chipLabel(status: string): string {
  switch (status) {
    case "APPROVED": return "Approved";
    case "REJECTED": return "Rejected";
    case "DISBURSED": return "Disbursed";
    case "DRAFT": return "Draft";
    case "SUBMITTED": return "Pending";
    case "UNDER_REVIEW": return "In Review";
    case "SENT_BACK": return "Sent Back";
    default: return status;
  }
}

/** Indian-system number-to-words, capped at a few crores. */
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

export default async function PrintApplicationPage({
  params,
}: {
  params: { id: string };
}) {
  const [app, organization] = await Promise.all([
    prisma.loanApplication.findUnique({
      where: { id: params.id },
      include: {
        customer: { include: { documents: true, branch: true } },
        branch: true,
        createdBy: { select: { name: true, employeeCode: true } },
        reviewedBy: { select: { name: true } },
        documents: true,
      },
    }),
    getSetting("organization"),
  ]);
  if (!app) notFound();

  const signature = app.customer.documents.find((d) => d.type === "SIGNATURE");
  const company = organization.companyName || "Samanta Finance";

  return (
    <div className="print-root">
      <PrintActions backHref={`/admin/loan-applications/${app.id}`} />

      {/* ─────────── PAGE 1 ─────────── */}
      <div className="a4-page">
        <div className="a4-inner">
          {/* Header bar */}
          <header className="pa-header">
            <div className="pa-brand">
              <div className="pa-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt={`${company} logo`} />
              </div>
              <div>
                <div className="pa-brand-name">{company}</div>
                <div className="pa-brand-tag">Credit Facility Application</div>
              </div>
            </div>
            <div className="pa-header-right">
              <div className="pa-app-no">{app.applicationNo}</div>
              <div className={`pa-chip pa-chip-${app.status}`}>
                <span className="pa-chip-dot" />
                {chipLabel(app.status)}
              </div>
            </div>
          </header>

          {/* Hero amount card */}
          <section className="pa-hero-card">
            <div className="pa-hero-card-bg" />
            <div className="pa-hero-main">
              <div className="pa-hero-label">Principal Sanctioned</div>
              <div className="pa-hero-amount">
                <span className="pa-hero-currency">₹</span>
                {Number(app.principal).toLocaleString("en-IN")}
              </div>
              <div className="pa-hero-words">{amountInWords(app.principal)}</div>
            </div>
            <div className="pa-hero-stats">
              <div className="pa-hero-stat">
                <div className="pa-hero-stat-label">Installment</div>
                <div className="pa-hero-stat-value accent">{formatMoney(app.installmentAmount)}</div>
              </div>
              <div className="pa-hero-stat">
                <div className="pa-hero-stat-label">Tenure</div>
                <div className="pa-hero-stat-value">
                  {app.tenureCount}
                  <span className="pa-hero-stat-unit"> {app.loanType.toLowerCase()}</span>
                </div>
              </div>
              <div className="pa-hero-stat">
                <div className="pa-hero-stat-label">Total Payable</div>
                <div className="pa-hero-stat-value">{formatMoney(app.totalPayable)}</div>
              </div>
              <div className="pa-hero-stat">
                <div className="pa-hero-stat-label">Interest</div>
                <div className="pa-hero-stat-value">{app.interestRate}%<span className="pa-hero-stat-unit"> p.a.</span></div>
              </div>
            </div>
          </section>

          {/* Meta strip */}
          <div className="pa-meta-strip">
            <div className="pa-meta-cell">
              <div className="pa-meta-label">Customer</div>
              <div className="pa-meta-value pa-mono">{app.customer.customerCode}</div>
            </div>
            <div className="pa-meta-cell">
              <div className="pa-meta-label">Branch</div>
              <div className="pa-meta-value">{app.branch.name}</div>
            </div>
            <div className="pa-meta-cell">
              <div className="pa-meta-label">Date</div>
              <div className="pa-meta-value">{fmtDate(app.createdAt)}</div>
            </div>
            <div className="pa-meta-cell">
              <div className="pa-meta-label">Prepared by</div>
              <div className="pa-meta-value">{app.createdBy.name}</div>
            </div>
          </div>

          {/* Card grid */}
          <div className="pa-grid">
            {/* Applicant card — spans 2 cols with photo */}
            <Card title="Applicant" subtitle="Identification" tone="emerald" className="pa-card-wide">
              <div className="pa-applicant-row">
                <div className="pa-photo-frame">
                  <div className="pa-photo">
                    {app.customer.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={app.customer.photoUrl} alt="Applicant" />
                    ) : (
                      <div className="pa-photo-empty">No Photo</div>
                    )}
                  </div>
                  <div className="pa-photo-caption">{app.customer.customerCode}</div>
                </div>
                <div className="pa-applicant-info">
                  <div className="pa-applicant-name">{app.customer.fullName}</div>
                  <div className="pa-fields-grid cols-3">
                    <Field label="Father / Husband" value={app.customer.fatherOrHusband} />
                    <Field label="Mobile" value={app.customer.mobile} mono />
                    <Field label="Alt. Mobile" value={app.customer.altMobile} mono />
                    <Field label="Date of Birth" value={app.customer.dob ? fmtDate(app.customer.dob) : null} />
                    <Field label="Gender" value={app.customer.gender} />
                    <Field label="Marital Status" value={app.customer.maritalStatus} />
                    <Field label="Aadhaar" value={app.customer.aadhaar} mono />
                    <Field label="PAN / Tax ID" value={app.customer.panOrTaxId} mono />
                    <Field label="Occupation" value={app.customer.occupation} />
                    <Field
                      label="Monthly Income"
                      value={app.customer.monthlyIncome ? formatMoney(app.customer.monthlyIncome) : null}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Address card */}
            <Card title="Address" subtitle="Residence" tone="amber" className="pa-card-wide">
              <div className="pa-fields-grid cols-2">
                <Field label="Current Address" value={app.customer.currentAddress} />
                <Field label="Permanent Address" value={app.customer.permanentAddress} />
              </div>
            </Card>

            {/* Banking card */}
            <Card title="Banking" subtitle="Disbursement Account" tone="blue">
              <div className="pa-fields-grid cols-1">
                <Field label="Bank Name" value={app.customer.bankName} />
                <Field label="Account Number" value={app.customer.bankAccount} mono />
                <Field label="IFSC" value={app.customer.ifsc} mono />
              </div>
            </Card>

            {/* Guarantor card */}
            <Card title="Guarantor & Reference" subtitle="Third-party contacts" tone="violet">
              <div className="pa-fields-grid cols-1">
                <Field label="Guarantor Name" value={app.customer.guarantorName} />
                <Field label="Guarantor Mobile" value={app.customer.guarantorMobile} mono />
                <Field label="Relation" value={app.customer.guarantorRelation} />
                <Field label="Reference Name" value={app.customer.referenceName} />
                <Field label="Reference Mobile" value={app.customer.referenceMobile} mono />
                <Field label="Nominee Name" value={app.customer.nomineeName} />
              </div>
            </Card>

            {/* Credit terms card */}
            <Card title="Credit Terms" subtitle="Sanction & schedule" tone="emerald" className="pa-card-wide">
              <div className="pa-terms-grid">
                <TermRow label="Loan Type" value={app.loanType} />
                <TermRow label="Interest Rate" value={`${app.interestRate}% p.a.`} />
                <TermRow label="Interest Amount" value={formatMoney(app.interestAmount)} />
                <TermRow label="Processing Fee" value={formatMoney(app.processingFee)} />
                <TermRow label="Start Date" value={fmtDate(app.startDate)} />
                <TermRow label="Maturity Date" value={fmtDate(app.maturityDate)} />
                <TermRow label="Purpose" value={app.purpose || "—"} wide />
                {app.notes ? <TermRow label="Notes" value={app.notes} wide /> : null}
              </div>
            </Card>
          </div>

          {/* Declaration */}
          <section className="pa-decl-card">
            <div className="pa-decl-badge">Declaration</div>
            <p className="pa-decl">
              I declare that the information furnished in this application is true,
              complete and accurate to the best of my knowledge. I understand that any
              misstatement may result in rejection of this application and may attract
              legal consequences. I authorize <b>{company}</b> to verify the particulars
              stated herein, obtain credit reports from authorised bureaus, and to
              communicate with me regarding the processing, sanction, and servicing of
              the loan through telephonic, written or electronic means.
            </p>
          </section>

          {/* Signatures */}
          <section className="pa-sig-card">
            <div className="pa-sig-row">
              <div className="pa-sig-meta">
                <span className="pa-sig-meta-label">Place</span>
                <span className="pa-sig-meta-fill">{app.branch.name}</span>
              </div>
              <div className="pa-sig-meta">
                <span className="pa-sig-meta-label">Date</span>
                <span className="pa-sig-meta-fill">{fmtDate(app.createdAt)}</span>
              </div>
            </div>
            <div className="pa-signatures">
              <div className="pa-sig">
                {signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signature.url} alt="Signature" className="pa-sig-img" />
                )}
                <div className="pa-sig-line" />
                <div className="pa-sig-label">Applicant</div>
                <div className="pa-sig-name">{app.customer.fullName}</div>
              </div>
              <div className="pa-sig">
                <div className="pa-sig-line" />
                <div className="pa-sig-label">Guarantor</div>
                <div className="pa-sig-name">{app.customer.guarantorName || "—"}</div>
              </div>
              <div className="pa-sig">
                <div className="pa-sig-line" />
                <div className="pa-sig-label">For {company}</div>
                <div className="pa-sig-name">Authorized Signatory</div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pa-footer">
            <div>
              <b>{app.createdBy.name}</b> · {app.createdBy.employeeCode}
              {app.reviewedBy && <> · Reviewed by <b>{app.reviewedBy.name}</b></>}
            </div>
            <div className="pa-footer-mono">
              {app.applicationNo} / {fmtDateTime(app.createdAt)} / Page 01
            </div>
          </footer>
        </div>
      </div>

      {/* ─────────── PAGE 2: Annexure ─────────── */}
      {(app.customer.documents.filter((d) => d.type !== "SIGNATURE").length > 0 ||
        app.documents.length > 0) && (
        <div className="a4-page">
          <div className="a4-inner">
            <header className="pa-header">
              <div className="pa-brand">
                <div className="pa-logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt={`${company} logo`} />
                </div>
                <div>
                  <div className="pa-brand-name">{company}</div>
                  <div className="pa-brand-tag">Annexure · Supporting Documents</div>
                </div>
              </div>
              <div className="pa-header-right">
                <div className="pa-app-no">{app.applicationNo}</div>
                <div className={`pa-chip pa-chip-${app.status}`}>
                  <span className="pa-chip-dot" />
                  {chipLabel(app.status)}
                </div>
              </div>
            </header>

            <div className="pa-meta-strip">
              <div className="pa-meta-cell">
                <div className="pa-meta-label">Customer</div>
                <div className="pa-meta-value">{app.customer.fullName}</div>
              </div>
              <div className="pa-meta-cell">
                <div className="pa-meta-label">Code</div>
                <div className="pa-meta-value pa-mono">{app.customer.customerCode}</div>
              </div>
              <div className="pa-meta-cell">
                <div className="pa-meta-label">Branch</div>
                <div className="pa-meta-value">{app.branch.name}</div>
              </div>
              <div className="pa-meta-cell">
                <div className="pa-meta-label">Date</div>
                <div className="pa-meta-value">{fmtDate(app.createdAt)}</div>
              </div>
            </div>

            {app.customer.documents.filter((d) => d.type !== "SIGNATURE").length > 0 && (
              <Card title="KYC Documents" subtitle="Identity & address proof" tone="emerald" className="pa-card-wide pa-card-mb">
                <div className="pa-doc-grid">
                  {app.customer.documents
                    .filter((d) => d.type !== "SIGNATURE")
                    .map((d) => (
                      <DocThumb key={d.id} label={d.type.replace(/_/g, " ")} url={d.url} />
                    ))}
                </div>
              </Card>
            )}

            {app.documents.length > 0 && (
              <Card title="Loan Documents" subtitle="Application annexures" tone="blue" className="pa-card-wide pa-card-mb">
                <div className="pa-doc-grid">
                  {app.documents.map((d) => (
                    <DocThumb key={d.id} label={d.type.replace(/_/g, " ")} url={d.url} />
                  ))}
                </div>
              </Card>
            )}

            <footer className="pa-footer">
              <div>Annexure to <b>{app.applicationNo}</b></div>
              <div className="pa-footer-mono">
                {company.toUpperCase()} / {fmtDate(app.createdAt)} / Page 02
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  tone = "emerald",
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  tone?: "emerald" | "amber" | "blue" | "violet";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`pa-card pa-card-${tone} ${className}`}>
      <div className="pa-card-head">
        <div className="pa-card-title-wrap">
          <span className="pa-card-dot" />
          <span className="pa-card-title">{title}</span>
        </div>
        {subtitle && <div className="pa-card-subtitle">{subtitle}</div>}
      </div>
      <div className="pa-card-body">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="pa-field">
      <div className="pa-field-label">{label}</div>
      <div className={`pa-field-value${empty ? " empty" : ""}${mono ? " pa-mono" : ""}`}>
        {empty ? "—" : String(value)}
      </div>
    </div>
  );
}

function TermRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`pa-term-row${wide ? " wide" : ""}`}>
      <span className="pa-term-label">{label}</span>
      <span className="pa-term-value">{value}</span>
    </div>
  );
}

function DocThumb({ label, url }: { label: string; url: string }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  return (
    <div className="pa-doc">
      <div className="pa-doc-label"><span>{label}</span></div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} />
      ) : (
        <a href={url} target="_blank" rel="noreferrer">View file ↗</a>
      )}
    </div>
  );
}
