import ExcelJS from "exceljs";
import type { ReportColumn } from "@/server/services/report-service";

type ExportExcelParams = {
  title: string;
  generatedAt: string;
  filters: Record<string, string>;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: Record<string, string | number>;
};

export async function exportExcel(params: ExportExcelParams) {
  const { title, generatedAt, filters, columns, rows, summary } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Samanta LMS";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.substring(0, 31));

  // Title row
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14 };
  sheet.mergeCells(1, 1, 1, columns.length);
  titleRow.alignment = { horizontal: "left" };

  // Generated at
  const metaRow = sheet.addRow([`Generated: ${generatedAt}`]);
  metaRow.font = { size: 9, color: { argb: "FF888888" } };
  sheet.mergeCells(2, 1, 2, columns.length);

  // Filters
  const filterEntries = Object.entries(filters);
  if (filterEntries.length > 0) {
    const filterText = filterEntries.map(([k, v]) => `${k}: ${v}`).join("  |  ");
    const filterRow = sheet.addRow([filterText]);
    filterRow.font = { size: 9, italic: true, color: { argb: "FF666666" } };
    sheet.mergeCells(3, 1, 3, columns.length);
  }

  // Empty row
  sheet.addRow([]);

  // Header row
  const headerValues = columns.map((c) => c.label);
  const headerRow = sheet.addRow(headerValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF29417A" },
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF29417A" } },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Set column widths and alignment
  columns.forEach((col, i) => {
    const excelCol = sheet.getColumn(i + 1);
    // Auto-width: max of header length and sample data
    let maxLen = col.label.length;
    for (let r = 0; r < Math.min(rows.length, 50); r++) {
      const val = rows[r][col.key];
      if (val != null) maxLen = Math.max(maxLen, String(val).length);
    }
    excelCol.width = Math.min(Math.max(maxLen + 2, 10), 35);
  });

  // Data rows
  rows.forEach((row, rowIdx) => {
    const values = columns.map((c) => {
      const val = row[c.key];
      if (val == null) return "";
      return val;
    });
    const dataRow = sheet.addRow(values);
    dataRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      cell.font = { size: 9 };
      if (col?.align === "right") {
        cell.alignment = { horizontal: "right" };
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0.00";
        }
      }
      // Alternating row colors
      if (rowIdx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8F9FC" },
        };
      }
    });
  });

  // Summary section
  if (summary && Object.keys(summary).length > 0) {
    sheet.addRow([]);
    const summaryHeader = sheet.addRow(["Summary"]);
    summaryHeader.font = { bold: true, size: 11 };

    Object.entries(summary).forEach(([key, val]) => {
      const sRow = sheet.addRow([key, val]);
      sRow.getCell(1).font = { bold: true, size: 9, color: { argb: "FF555555" } };
      sRow.getCell(2).font = { bold: true, size: 9 };
    });
  }

  // Auto-filter on header row
  const headerRowNum = filterEntries.length > 0 ? 5 : 4;
  sheet.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: columns.length },
  };

  // Freeze panes (freeze header)
  sheet.views = [{ state: "frozen", ySplit: headerRowNum }];

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${generatedAt.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
