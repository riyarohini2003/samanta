import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportColumn } from "@/server/services/report-service";

type ExportPdfParams = {
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: Record<string, string | number>;
};

export function exportPdf(params: ExportPdfParams) {
  const { title, generatedAt, filters, columns, rows, summary } = params;

  const doc = new jsPDF({ orientation: columns.length > 8 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);

  // Subtitle: Samanta LMS
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Samanta LMS", 14, 24);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 14, 24, { align: "right" });

  // Filters
  let y = 30;
  const filterEntries = Object.entries(filters);
  if (filterEntries.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    const filterText = filterEntries.map(([k, v]) => `${k}: ${v}`).join("  |  ");
    doc.text(filterText, 14, y);
    y += 6;
  }

  // Data table
  const head = columns.map((c) => c.label);
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val == null) return "";
      if (typeof val === "number" && c.align === "right") return val.toLocaleString("en-IN");
      return String(val);
    })
  );

  const colStyles: Record<number, { halign: "left" | "right" | "center" }> = {};
  columns.forEach((c, i) => {
    if (c.align) colStyles[i] = { halign: c.align };
  });

  autoTable(doc, {
    startY: y + 2,
    head: [head],
    body,
    columnStyles: colStyles,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [41, 65, 122],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    },
  });

  // Summary section
  if (summary && Object.keys(summary).length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;
    let sy = finalY + 10;

    // Check if we need a new page
    if (sy > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      sy = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Summary", 14, sy);
    sy += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    Object.entries(summary).forEach(([key, val]) => {
      doc.setTextColor(80);
      doc.text(`${key}:`, 14, sy);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text(String(val), 70, sy);
      doc.setFont("helvetica", "normal");
      sy += 5;
    });
  }

  // Download
  const filename = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${generatedAt.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}
