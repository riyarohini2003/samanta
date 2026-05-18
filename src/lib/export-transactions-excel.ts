import ExcelJS from "exceljs";

type Column = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  money?: boolean;
};

type SheetSpec = {
  name: string;
  title: string;
  columns: Column[];
  rows: Record<string, string | number | null | undefined>[];
};

type TransactionsExportParams = {
  fileName: string;
  generatedAt: string;
  filters: Record<string, string>;
  summary: Record<string, string | number>;
  sheets: SheetSpec[];
};

const HEADER_FILL = "FF29417A";
const ZEBRA_FILL = "FFF8F9FC";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: HEADER_FILL } },
    };
  });
}

function buildSheet(workbook: ExcelJS.Workbook, spec: SheetSpec, meta: {
  generatedAt: string;
  filters: Record<string, string>;
}) {
  const sheet = workbook.addWorksheet(spec.name.substring(0, 31));
  const colCount = spec.columns.length;

  const titleRow = sheet.addRow([spec.title]);
  titleRow.font = { bold: true, size: 14 };
  if (colCount > 1) sheet.mergeCells(1, 1, 1, colCount);

  const metaRow = sheet.addRow([`Generated: ${meta.generatedAt}`]);
  metaRow.font = { size: 9, color: { argb: "FF888888" } };
  if (colCount > 1) sheet.mergeCells(2, 1, 2, colCount);

  const filterEntries = Object.entries(meta.filters);
  let headerRowNum = 4;
  if (filterEntries.length > 0) {
    const filterText = filterEntries.map(([k, v]) => `${k}: ${v}`).join("  |  ");
    const filterRow = sheet.addRow([filterText]);
    filterRow.font = { size: 9, italic: true, color: { argb: "FF666666" } };
    if (colCount > 1) sheet.mergeCells(3, 1, 3, colCount);
    sheet.addRow([]);
    headerRowNum = 5;
  } else {
    sheet.addRow([]);
  }

  const headerRow = sheet.addRow(spec.columns.map((c) => c.label));
  styleHeader(headerRow);

  spec.columns.forEach((col, i) => {
    const excelCol = sheet.getColumn(i + 1);
    let maxLen = col.label.length;
    for (let r = 0; r < Math.min(spec.rows.length, 50); r++) {
      const val = spec.rows[r][col.key];
      if (val != null) maxLen = Math.max(maxLen, String(val).length);
    }
    excelCol.width = Math.min(Math.max(maxLen + 2, 10), 35);
  });

  spec.rows.forEach((row, idx) => {
    const dataRow = sheet.addRow(
      spec.columns.map((c) => (row[c.key] == null ? "" : row[c.key])),
    );
    dataRow.eachCell((cell, colNumber) => {
      const col = spec.columns[colNumber - 1];
      cell.font = { size: 9 };
      if (col?.align === "right") {
        cell.alignment = { horizontal: "right" };
      }
      if (col?.money && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
        cell.alignment = { horizontal: "right" };
      }
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ZEBRA_FILL },
        };
      }
    });
  });

  sheet.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: colCount },
  };
  sheet.views = [{ state: "frozen", ySplit: headerRowNum }];
}

export async function exportTransactionsExcel(params: TransactionsExportParams) {
  const { fileName, generatedAt, filters, summary, sheets } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Samanta LMS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  const titleRow = summarySheet.addRow(["Transactions Report"]);
  titleRow.font = { bold: true, size: 14 };
  summarySheet.mergeCells(1, 1, 1, 2);

  const metaRow = summarySheet.addRow([`Generated: ${generatedAt}`]);
  metaRow.font = { size: 9, color: { argb: "FF888888" } };
  summarySheet.mergeCells(2, 1, 2, 2);

  summarySheet.addRow([]);

  const filterHeader = summarySheet.addRow(["Filters", ""]);
  filterHeader.font = { bold: true, size: 11 };

  Object.entries(filters).forEach(([k, v]) => {
    const r = summarySheet.addRow([k, v]);
    r.getCell(1).font = { bold: true, size: 9, color: { argb: "FF555555" } };
    r.getCell(2).font = { size: 9 };
  });

  summarySheet.addRow([]);

  const summaryHeader = summarySheet.addRow(["Summary", ""]);
  summaryHeader.font = { bold: true, size: 11 };

  Object.entries(summary).forEach(([k, v]) => {
    const r = summarySheet.addRow([k, v]);
    r.getCell(1).font = { bold: true, size: 9, color: { argb: "FF555555" } };
    r.getCell(2).font = { bold: true, size: 9 };
    if (typeof v === "number") {
      r.getCell(2).numFmt = "#,##0.00";
      r.getCell(2).alignment = { horizontal: "right" };
    }
  });

  summarySheet.getColumn(1).width = 28;
  summarySheet.getColumn(2).width = 28;

  for (const spec of sheets) {
    buildSheet(workbook, spec, { generatedAt, filters });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
