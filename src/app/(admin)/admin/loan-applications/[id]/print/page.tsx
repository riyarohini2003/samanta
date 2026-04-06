import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getSetting } from "@/server/settings";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { PrintActions } from "./print-actions";
import "./print.css";

export const dynamic = "force-dynamic";

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

  return (
    <div className="print-root">
      <PrintActions backHref={`/admin/loan-applications/${app.id}`} />

      <div className="a4-page">
        {/* ── Header ─────────────────────────────────────── */}
        <header className="pa-header">
          <div>
            <h1 className="pa-company">{organization.companyName || "Samanta Finance"}</h1>
            {organization.legalName && (
              <div className="pa-muted">{organization.legalName}</div>
            )}
            {organization.address && <div className="pa-muted">{organization.address}</div>}
            <div className="pa-muted">
              {organization.contactPhone && <>Tel: {organization.contactPhone} · </>}
              {organization.contactEmail && <>{organization.contactEmail}</>}
              {organization.gstin && <> · GSTIN: {organization.gstin}</>}
            </div>
          </div>
          <div className="pa-meta">
            <div className="pa-title">LOAN APPLICATION</div>
            <div>
              <b>App No:</b> {app.applicationNo}
            </div>
            <div>
              <b>Date:</b> {fmtDate(app.createdAt)}
            </div>
            <div>
              <b>Branch:</b> {app.branch.name}
            </div>
            <div>
              <b>Status:</b> {app.status}
            </div>
          </div>
        </header>

        {/* ── Applicant ─────────────────────────────────── */}
        <section className="pa-section">
          <div className="pa-section-title">Applicant Details</div>
          <div className="pa-grid-2">
            <div className="pa-applicant">
              <Row label="Customer Code" value={app.customer.customerCode} />
              <Row label="Full Name" value={app.customer.fullName} />
              <Row
                label="Father / Husband"
                value={app.customer.fatherOrHusband || "—"}
              />
              <Row label="Mobile" value={app.customer.mobile} />
              <Row label="Alt Mobile" value={app.customer.altMobile || "—"} />
              <Row label="Aadhaar" value={app.customer.aadhaar || "—"} />
              <Row label="PAN / Tax ID" value={app.customer.panOrTaxId || "—"} />
              <Row
                label="Date of Birth"
                value={app.customer.dob ? fmtDate(app.customer.dob) : "—"}
              />
              <Row label="Gender" value={app.customer.gender || "—"} />
              <Row label="Marital Status" value={app.customer.maritalStatus || "—"} />
              <Row label="Occupation" value={app.customer.occupation || "—"} />
              <Row
                label="Monthly Income"
                value={
                  app.customer.monthlyIncome
                    ? formatMoney(app.customer.monthlyIncome)
                    : "—"
                }
              />
            </div>
            <div className="pa-photo-box">
              {app.customer.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={app.customer.photoUrl} alt="Customer" />
              ) : (
                <div className="pa-photo-placeholder">Applicant Photo</div>
              )}
            </div>
          </div>
        </section>

        {/* ── Address ───────────────────────────────────── */}
        <section className="pa-section">
          <div className="pa-section-title">Address</div>
          <Row label="Current Address" value={app.customer.currentAddress} wide />
          <Row
            label="Permanent Address"
            value={app.customer.permanentAddress || "—"}
            wide
          />
        </section>

        {/* ── Guarantor ─────────────────────────────────── */}
        <section className="pa-section">
          <div className="pa-section-title">Guarantor & Reference</div>
          <div className="pa-grid-3">
            <Row label="Guarantor Name" value={app.customer.guarantorName || "—"} />
            <Row label="Guarantor Mobile" value={app.customer.guarantorMobile || "—"} />
            <Row label="Relation" value={app.customer.guarantorRelation || "—"} />
            <Row label="Reference Name" value={app.customer.referenceName || "—"} />
            <Row label="Reference Mobile" value={app.customer.referenceMobile || "—"} />
          </div>
        </section>

        {/* ── Bank & Nominee ────────────────────────────── */}
        <section className="pa-section">
          <div className="pa-section-title">Bank & Nominee</div>
          <div className="pa-grid-3">
            <Row label="Bank Name" value={app.customer.bankName || "—"} />
            <Row label="Account Number" value={app.customer.bankAccount || "—"} />
            <Row label="IFSC" value={app.customer.ifsc || "—"} />
            <Row label="Nominee Name" value={app.customer.nomineeName || "—"} />
            <Row label="Nominee Relation" value={app.customer.nomineeRelation || "—"} />
          </div>
        </section>

        {/* ── Loan Details ──────────────────────────────── */}
        <section className="pa-section">
          <div className="pa-section-title">Loan Request</div>
          <div className="pa-grid-3">
            <Row label="Loan Type" value={app.loanType} />
            <Row label="Principal" value={formatMoney(app.principal)} />
            <Row label="Interest Rate" value={`${app.interestRate}%`} />
            <Row label="Interest Amount" value={formatMoney(app.interestAmount)} />
            <Row label="Processing Fee" value={formatMoney(app.processingFee)} />
            <Row label="Tenure" value={`${app.tenureCount}`} />
            <Row label="Installment" value={formatMoney(app.installmentAmount)} />
            <Row label="Total Payable" value={formatMoney(app.totalPayable)} />
            <Row label="Start Date" value={fmtDate(app.startDate)} />
            <Row label="Maturity" value={fmtDate(app.maturityDate)} />
            <Row label="Purpose" value={app.purpose || "—"} />
          </div>
          {app.notes && (
            <div style={{ marginTop: 8 }}>
              <Row label="Notes" value={app.notes} wide />
            </div>
          )}
        </section>

        {/* ── Declaration ───────────────────────────────── */}
        <section className="pa-section">
          <div className="pa-section-title">Declaration</div>
          <p className="pa-decl">
            I hereby declare that the information furnished above is true, complete and
            correct to the best of my knowledge and belief. I understand that any false
            or misleading statement may result in the rejection of this application and
            appropriate legal action. I authorize{" "}
            <b>{organization.companyName || "the company"}</b> to verify the particulars
            and obtain credit reports for the purpose of processing this loan.
          </p>
        </section>

        {/* ── Signatures ────────────────────────────────── */}
        <section className="pa-signatures">
          <div className="pa-sig">
            {signature && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signature.url} alt="Signature" className="pa-sig-img" />
            )}
            <div className="pa-sig-line" />
            <div className="pa-sig-label">Applicant Signature</div>
            <div className="pa-muted">{app.customer.fullName}</div>
          </div>
          <div className="pa-sig">
            <div className="pa-sig-line" />
            <div className="pa-sig-label">Guarantor Signature</div>
            <div className="pa-muted">{app.customer.guarantorName || ""}</div>
          </div>
          <div className="pa-sig">
            <div className="pa-sig-line" />
            <div className="pa-sig-label">Authorized Signatory</div>
            <div className="pa-muted">
              For {organization.companyName || "Samanta Finance"}
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────── */}
        <footer className="pa-footer">
          <div>
            Prepared by: {app.createdBy.name} ({app.createdBy.employeeCode})
          </div>
          <div>
            {app.reviewedBy ? `Reviewed by: ${app.reviewedBy.name}` : "Pending Review"} ·{" "}
            {fmtDateTime(app.createdAt)}
          </div>
        </footer>
      </div>

      {/* Supporting documents page (printed separately) */}
      {(app.customer.documents.filter((d) => d.type !== "SIGNATURE").length > 0 ||
        app.documents.length > 0) && (
        <div className="a4-page">
          <header className="pa-header">
            <div>
              <h1 className="pa-company">{organization.companyName || "Samanta Finance"}</h1>
              <div className="pa-muted">Supporting Documents</div>
            </div>
            <div className="pa-meta">
              <div>
                <b>App No:</b> {app.applicationNo}
              </div>
              <div>
                <b>Customer:</b> {app.customer.fullName}
              </div>
            </div>
          </header>

          <section className="pa-section">
            <div className="pa-section-title">KYC Documents</div>
            <div className="pa-doc-grid">
              {app.customer.documents
                .filter((d) => d.type !== "SIGNATURE")
                .map((d) => (
                  <DocThumb key={d.id} label={d.type.replace(/_/g, " ")} url={d.url} />
                ))}
            </div>
          </section>

          {app.documents.length > 0 && (
            <section className="pa-section">
              <div className="pa-section-title">Loan Supporting Documents</div>
              <div className="pa-doc-grid">
                {app.documents.map((d) => (
                  <DocThumb key={d.id} label={d.type.replace(/_/g, " ")} url={d.url} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={"pa-row" + (wide ? " pa-row-wide" : "")}>
      <div className="pa-row-label">{label}</div>
      <div className="pa-row-value">{value}</div>
    </div>
  );
}

function DocThumb({ label, url }: { label: string; url: string }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  return (
    <div className="pa-doc">
      <div className="pa-doc-label">{label}</div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} />
      ) : (
        <a href={url} target="_blank" rel="noreferrer">
          View file
        </a>
      )}
    </div>
  );
}
