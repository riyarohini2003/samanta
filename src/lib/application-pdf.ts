import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ApplicationData = {
  applicationNo: string;
  loanType: string;
  principal: number;
  interestRate: number;
  processingFee: number;
  tenureCount: number;
  installmentAmount: number;
  interestAmount: number;
  totalPayable: number;
  startDate: string;
  maturityDate: string;
  purpose?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  customer: {
    customerCode: string;
    fullName: string;
    fatherOrHusband?: string | null;
    mobile: string;
    altMobile?: string | null;
    aadhaar?: string | null;
    panOrTaxId?: string | null;
    dob?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
    occupation?: string | null;
    monthlyIncome?: number | null;
    currentAddress: string;
    permanentAddress?: string | null;
    guarantorName?: string | null;
    guarantorMobile?: string | null;
    guarantorRelation?: string | null;
    referenceName?: string | null;
    referenceMobile?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    ifsc?: string | null;
    nomineeName?: string | null;
    nomineeRelation?: string | null;
    photoUrl?: string | null;
  };
  branch: { code: string; name: string };
  createdBy: { name: string; employeeCode?: string };
};

function fmtMoney(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function val(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  return String(v);
}

export function generateApplicationPdf(app: ApplicationData, mode: "download" | "print" = "download") {
  const doc = new jsPDF("portrait", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const c = app.customer;

  // ─── Header ───
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Samanta LMS", 14, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Loan Application Form", 14, 23);

  doc.setFontSize(9);
  doc.text(`Application No: ${app.applicationNo}`, pw - 14, 16, { align: "right" });
  doc.text(`Date: ${fmtDate(app.createdAt)}`, pw - 14, 22, { align: "right" });
  doc.text(`Status: ${app.status}`, pw - 14, 28, { align: "right" });
  doc.setTextColor(0);

  doc.setDrawColor(41, 65, 122);
  doc.setLineWidth(0.5);
  doc.line(14, 31, pw - 14, 31);

  let y = 38;

  // ─── Helper: section heading ───
  function sectionHead(title: string) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 16;
    }
    doc.setFillColor(41, 65, 122);
    doc.rect(14, y - 4, pw - 28, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    doc.text(title, 17, y + 1);
    doc.setTextColor(0);
    y += 8;
  }

  // ─── Helper: field rows ───
  function fieldTable(fields: [string, string][]) {
    // Lay out as 2-column key-value pairs
    const rows: string[][] = [];
    for (let i = 0; i < fields.length; i += 2) {
      const left = fields[i];
      const right = fields[i + 1];
      if (right) {
        rows.push([left[0], left[1], right[0], right[1]]);
      } else {
        rows.push([left[0], left[1], "", ""]);
      }
    }

    autoTable(doc, {
      startY: y,
      body: rows,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [80, 80, 80], cellWidth: 38 },
        1: { cellWidth: 52 },
        2: { fontStyle: "bold", textColor: [80, 80, 80], cellWidth: 38 },
        3: { cellWidth: 52 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {},
    });

    y = (doc as any).lastAutoTable?.finalY ?? y + 10;
    y += 4;
  }

  // ─── Section: Customer Personal Details ───
  sectionHead("CUSTOMER PERSONAL DETAILS");
  fieldTable([
    ["Full Name", val(c.fullName)],
    ["Customer Code", val(c.customerCode)],
    ["Father / Husband", val(c.fatherOrHusband)],
    ["Mobile", val(c.mobile)],
    ["Alt. Mobile", val(c.altMobile)],
    ["Aadhaar", val(c.aadhaar)],
    ["PAN / Tax ID", val(c.panOrTaxId)],
    ["Date of Birth", fmtDate(c.dob)],
    ["Gender", val(c.gender)],
    ["Marital Status", val(c.maritalStatus)],
    ["Occupation", val(c.occupation)],
    ["Monthly Income", c.monthlyIncome != null ? fmtMoney(c.monthlyIncome) : "—"],
  ]);

  // ─── Section: Address ───
  sectionHead("ADDRESS");
  fieldTable([
    ["Current Address", val(c.currentAddress)],
    ["Permanent Address", val(c.permanentAddress)],
  ]);

  // ─── Section: Guarantor & Reference ───
  sectionHead("GUARANTOR & REFERENCE");
  fieldTable([
    ["Guarantor Name", val(c.guarantorName)],
    ["Guarantor Mobile", val(c.guarantorMobile)],
    ["Guarantor Relation", val(c.guarantorRelation)],
    ["Reference Name", val(c.referenceName)],
    ["Reference Mobile", val(c.referenceMobile)],
  ]);

  // ─── Section: Bank & Nominee ───
  sectionHead("BANK & NOMINEE");
  fieldTable([
    ["Bank Name", val(c.bankName)],
    ["Account Number", val(c.bankAccount)],
    ["IFSC", val(c.ifsc)],
    ["Nominee Name", val(c.nomineeName)],
    ["Nominee Relation", val(c.nomineeRelation)],
  ]);

  // ─── Section: Loan Details ───
  sectionHead("LOAN APPLICATION DETAILS");
  fieldTable([
    ["Loan Type", val(app.loanType)],
    ["Branch", `${app.branch.code} - ${app.branch.name}`],
    ["Principal", fmtMoney(app.principal)],
    ["Interest Rate", `${app.interestRate}%`],
    ["Processing Fee", fmtMoney(app.processingFee)],
    ["Tenure", `${app.tenureCount} installments`],
    ["Installment Amt", fmtMoney(app.installmentAmount)],
    ["Interest Amount", fmtMoney(app.interestAmount)],
    ["Total Payable", fmtMoney(app.totalPayable)],
    ["Start Date", fmtDate(app.startDate)],
    ["Maturity Date", fmtDate(app.maturityDate)],
    ["Purpose", val(app.purpose)],
  ]);

  if (app.notes) {
    sectionHead("NOTES");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(app.notes, pw - 32);
    doc.text(lines, 17, y);
    y += lines.length * 4 + 4;
  }

  // ─── Signature area ───
  if (y > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    y = 30;
  }
  y += 15;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  doc.line(14, y, 75, y);
  doc.line(pw / 2 + 5, y, pw - 14, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Customer Signature", 14, y + 5);
  doc.text("Authorized Signature", pw / 2 + 5, y + 5);
  doc.setTextColor(0);

  // ─── Footer: submitted by ───
  y += 14;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `Submitted by: ${app.createdBy.name}${app.createdBy.employeeCode ? ` (${app.createdBy.employeeCode})` : ""} | Printed: ${new Date().toLocaleString("en-IN")}`,
    14,
    y,
  );

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pw - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" },
    );
  }

  if (mode === "print") {
    const blobUrl = doc.output("bloburl");
    const win = window.open(blobUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print(), { once: true });
    }
  } else {
    doc.save(`Application_${app.applicationNo}.pdf`);
  }
}
