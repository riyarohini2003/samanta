/**
 * Bulk-import service — shared by the admin UI and the CLI script.
 *
 * Column layout matches the operator's legacy register sheet:
 *   Name | fatherOrHusband Name | Address | Phone No | Principal | Amount to |
 *   EMI | No Of Days of emi | start Date | Collection | Due | Closing Date | Status
 *
 * One row = one loan + its customer + its prior collection. Branch and
 * assigned-employee are picked from the UI (not in the sheet) and forwarded
 * via the import options.
 */
import ExcelJS from "exceljs";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { prisma } from "@/server/db";
import type {
  LoanType,
  DisbursementMode,
  LoanStatus,
  InstallmentStatus,
  Prisma,
} from "@prisma/client";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

// ─── Column definitions ────────────────────────────────────────────────
export type Col = {
  key: string;
  header: string;          // exact label written to row 1 of the sheet
  aliases?: string[];      // case-insensitive alternative headers we will accept
  example: string | number;
  note?: string;
};

export const loanCols: Col[] = [
  { key: "loanNo",           header: "Loan No",              aliases: ["sl no", "sr no", "serial no", "s.no", "s no", "sno", "loan number", "row no"], example: 1, note: "Serial number per row (required, integer, must be unique within the sheet). Used to identify rows in the report — database account number is generated automatically." },
  { key: "fullName",         header: "Name",                 aliases: ["full name", "customer name"],                 example: "Ramesh Kumar",              note: "Customer full name (required)" },
  { key: "fatherOrHusband",  header: "fatherOrHusband Name", aliases: ["father name", "father/husband name", "father or husband"], example: "Suresh Kumar",      note: "Father or husband name" },
  { key: "currentAddress",   header: "Address",              aliases: ["current address"],                            example: "H.No. 21, Sector 4, Bokaro", note: "Customer address (required)" },
  { key: "customerMobile",   header: "Phone No",             aliases: ["phone", "mobile", "phone number"],            example: "9876543210",                note: "10 digits, primary customer ID (required)" },
  { key: "principal",        header: "Principal",            aliases: ["loan amount", "principal amount"],            example: 20000,                       note: "Loan amount disbursed (required)" },
  { key: "totalPayable",     header: "Amount to",            aliases: ["amount to repay", "amount to pay", "total amount", "total payable"], example: 24800, note: "Total amount to be repaid (principal + interest, required)" },
  { key: "installmentAmount",header: "EMI",                  aliases: ["installment", "instalment", "emi amount"],    example: 248,                         note: "Per-instalment amount (required)" },
  { key: "loanType",         header: "Loan Type",            aliases: ["type", "frequency", "loan frequency"],        example: "DAILY",                     note: "DAILY / WEEKLY / MONTHLY (defaults to DAILY)" },
  { key: "tenureCount",      header: "No Of Days of emi",    aliases: ["no of days", "tenure", "days", "no of installments", "no. of days", "no. of days of emi", "tenureCount", "no of emi", "number of installments"], example: 100, note: "Number of instalments (days for DAILY, weeks for WEEKLY, months for MONTHLY)" },
  { key: "startDate",        header: "start Date",           aliases: ["start", "disbursement date"],                 example: "2026-01-01",                note: "YYYY-MM-DD; first instalment date (required)" },
  { key: "paidSoFar",        header: "Collection",           aliases: ["collected", "paid", "collection amount"],     example: 0,                           note: "Total already collected (defaults 0)" },
  { key: "due",              header: "Due",                  aliases: ["pending", "outstanding"],                     example: 24800,                       note: "Outstanding amount (informational, recomputed)" },
  { key: "closingDate",      header: "Closing Date",         aliases: ["maturity", "maturity date", "end date"],      example: "2026-04-10",                note: "YYYY-MM-DD; overrides computed maturity if present" },
  { key: "status",           header: "Status",               aliases: [],                                             example: "ACTIVE",                    note: "ACTIVE / CLOSED (defaults derived from Collection)" },
];

const HEADER_LOOKUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of loanCols) {
    const norm = (s: string) => s.toLowerCase().replace(/\*$/g, "").replace(/[\s_\-./]+/g, " ").trim();
    map[norm(c.header)] = c.key;
    map[norm(c.key)] = c.key;
    for (const a of c.aliases ?? []) map[norm(a)] = c.key;
  }
  return map;
})();

function normalizeHeader(h: string): string | undefined {
  const k = h.toLowerCase().replace(/\*$/g, "").replace(/[\s_\-./]+/g, " ").trim();
  return HEADER_LOOKUP[k];
}

// ─── Loan math ─────────────────────────────────────────────────────────
type RatePeriod = "WEEKLY" | "MONTHLY" | "ANNUAL";

function addUnits(d: dayjs.Dayjs, type: LoanType, n: number): dayjs.Dayjs {
  return type === "DAILY" ? d.add(n, "day") : type === "WEEKLY" ? d.add(n, "week") : d.add(n, "month");
}
function round2(n: number) { return Math.round(n * 100) / 100; }

/**
 * Back-calculate annualised interest rate from principal/totalPayable/tenure
 * so we can persist a sane interestRate on the LoanApplication record.
 * For DAILY loans: rate = (interest / principal) × (365 / days) × 100
 */
function deriveAnnualRate(principal: number, totalPayable: number, tenureCount: number, loanType: LoanType): number {
  if (principal <= 0 || tenureCount <= 0) return 0;
  const interest = Math.max(totalPayable - principal, 0);
  const tenureYears = loanType === "DAILY" ? tenureCount / 365
                    : loanType === "WEEKLY" ? (tenureCount * 7) / 365
                    : tenureCount / 12;
  if (tenureYears <= 0) return 0;
  return round2((interest / principal) / tenureYears * 100);
}

function buildLoanFromSheet(input: {
  principal: number; totalPayable: number; installmentAmount: number;
  tenureCount: number; loanType: LoanType; startDate: Date; closingDate?: Date;
}) {
  const principal = round2(input.principal);
  const totalPayable = Math.round(input.totalPayable);
  const interestAmount = Math.max(round2(totalPayable - principal), 0);
  const installmentAmount = Math.round(input.installmentAmount);
  const startDate = dayjs.utc(input.startDate).startOf("day");
  const computedMaturity = addUnits(startDate, input.loanType, input.tenureCount - 1);
  const maturityDate = input.closingDate
    ? dayjs.utc(input.closingDate).startOf("day")
    : computedMaturity;
  return {
    principal, interestAmount, totalPayable, installmentAmount,
    startDate: startDate.toDate(), maturityDate: maturityDate.toDate(),
    tenureCount: input.tenureCount,
  };
}

function buildScheduleRows(params: {
  loanAccountId: string; loanType: LoanType; startDate: Date;
  tenureCount: number; installmentAmount: number; totalPayable: number;
  paidSoFar: number;
}) {
  const rows: {
    loanAccountId: string;
    installmentNo: number;
    dueDate: Date;
    dueAmount: number;
    paidAmount: number;
    status: InstallmentStatus;
    paidAt: Date | null;
  }[] = [];
  const start = dayjs.utc(params.startDate).startOf("day");
  const normal = Math.round(params.installmentAmount);
  const total = Math.round(params.totalPayable);
  const lastAmount = total - normal * (params.tenureCount - 1);
  let remaining = params.paidSoFar;
  let lastFullyPaidDueDate: Date | null = null;
  for (let i = 1; i <= params.tenureCount; i++) {
    const dueDate = addUnits(start, params.loanType, i - 1).toDate();
    const dueAmount = i === params.tenureCount ? lastAmount : normal;
    let paidAmount = 0;
    let status: InstallmentStatus = "PENDING";
    let paidAt: Date | null = null;
    if (remaining > 0) {
      const apply = Math.min(remaining, dueAmount);
      paidAmount = apply;
      remaining -= apply;
      if (apply >= dueAmount - 0.001) {
        status = "PAID";
        paidAt = dueDate;
        lastFullyPaidDueDate = dueDate;
      } else {
        status = "PARTIAL";
        paidAt = dueDate;
      }
    }
    rows.push({ loanAccountId: params.loanAccountId, installmentNo: i, dueDate, dueAmount, paidAmount, status, paidAt });
  }
  return { rows, lastFullyPaidDueDate };
}

// ─── Zod schema ────────────────────────────────────────────────────────
const dateLike = z.union([z.string(), z.date(), z.number()]).transform((v, ctx) => {
  // Excel sometimes hands us serial numbers, ISO strings, or formatted text like "01/06/2025".
  if (v instanceof Date) {
    const d = dayjs.utc(v);
    return d.startOf("day").toDate();
  }
  if (typeof v === "number") {
    // Excel serial date — Jan 1, 1900 epoch with 1900 leap-year bug.
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + v * 86400000);
  }
  const s = String(v).trim();
  // Try ISO first, then dd/mm/yyyy and dd-mm-yyyy variants.
  let d = dayjs.utc(s);
  if (!d.isValid()) {
    const fmts = ["DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY", "D-M-YYYY", "MM/DD/YYYY"];
    for (const f of fmts) {
      const try_ = dayjs.utc(s, f, true);
      if (try_.isValid()) { d = try_; break; }
    }
  }
  if (!d.isValid()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `invalid date: ${s}` });
    return z.NEVER;
  }
  return d.startOf("day").toDate();
});

const optStr = z.preprocess((v) => (v === "" || v == null ? undefined : String(v).trim()), z.string().optional());
const reqStr = z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string().min(1));
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().optional());
const num = z.preprocess((v) => (typeof v === "string" ? v.replace(/[,₹\s]/g, "") : v), z.coerce.number());

const loanRowSchema = z.object({
  loanNo: num.transform((n) => Math.round(n)).refine((n) => n > 0, "Loan No (serial) must be a positive integer"),
  fullName: reqStr,
  fatherOrHusband: optStr,
  currentAddress: reqStr,
  customerMobile: reqStr.transform((s) => s.replace(/\D/g, "")).refine((s) => /^\d{10}$/.test(s), "Phone No must be 10 digits"),
  principal: num.refine((n) => n > 0, "Principal must be positive"),
  totalPayable: num.refine((n) => n > 0, "Amount to must be positive"),
  installmentAmount: num.refine((n) => n > 0, "EMI must be positive"),
  loanType: z.preprocess(
    (v) => {
      if (v == null || v === "") return "DAILY";
      const s = String(v).trim().toUpperCase();
      if (s.startsWith("D")) return "DAILY";
      if (s.startsWith("W")) return "WEEKLY";
      if (s.startsWith("M")) return "MONTHLY";
      return s;
    },
    z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  ),
  tenureCount: num.transform((n) => Math.round(n)).refine((n) => n > 0, "tenure must be positive"),
  startDate: dateLike,
  paidSoFar: z.preprocess((v) => (v === "" || v == null ? 0 : v), num).default(0),
  due: optNum,
  closingDate: dateLike.optional(),
  status: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z.enum(["ACTIVE", "CLOSED"]).optional(),
  ),
});
type LoanRow = z.infer<typeof loanRowSchema>;

// ─── Counters ──────────────────────────────────────────────────────────
function pad(n: number, w: number) { return n.toString().padStart(w, "0"); }
async function nextSeq(key: string, tx?: Prisma.TransactionClient) {
  const c = tx ?? prisma;
  const row = await c.counter.upsert({
    where: { key }, update: { value: { increment: 1 } }, create: { key, value: 1 },
  });
  return row.value;
}
async function nextCustomerCode() { return `CUS${pad(await nextSeq("customer"), 6)}`; }
async function nextApplicationNo() { const n = await nextSeq("application"); return `APP-${new Date().getFullYear()}-${pad(n, 5)}`; }
async function nextLoanAccountNo() { const n = await nextSeq("loanAccount"); return `LN-${new Date().getFullYear()}-${pad(n, 5)}`; }
async function nextReceiptNo(tx?: Prisma.TransactionClient) { const n = await nextSeq("receipt", tx); return `RCP-${new Date().getFullYear()}-${pad(n, 6)}`; }

// ─── Workbook builders ─────────────────────────────────────────────────
function addLoanSheet(wb: ExcelJS.Workbook, rows?: Record<string, unknown>[]) {
  const ws = wb.addWorksheet("loans");
  ws.columns = loanCols.map((c) => ({ header: c.header, key: c.key, width: Math.max(c.header.length + 2, 18) }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } } as ExcelJS.Fill;
  if (rows && rows.length > 0) {
    for (const r of rows) ws.addRow(r);
  }
}

function addNotesSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("notes");
  ws.columns = [
    { header: "column", key: "col", width: 28 },
    { header: "note", key: "note", width: 90 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const c of loanCols) ws.addRow({ col: c.header, note: c.note ?? "" });
  ws.addRow({});
  ws.addRow({ col: "Branch / Employee", note: "Selected from the Bulk Import page before upload — not in the sheet." });
  ws.addRow({ col: "Loan Type", note: "DAILY → tenure in days. WEEKLY → tenure in weeks. MONTHLY → tenure in months. Defaults to DAILY if blank." });
  ws.addRow({ col: "Interest rate", note: "Derived automatically from Principal and Amount to over the tenure." });
}

export async function generateTemplateBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  addLoanSheet(wb);
  addNotesSheet(wb);
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

function buildSampleRows() {
  return [
    { loanNo: 1, fullName: "Ramesh Kumar", fatherOrHusband: "Suresh Kumar", currentAddress: "H.No. 21, Sector 4, Bokaro", customerMobile: "9000000001", principal: 20000, totalPayable: 24800, installmentAmount: 248,  loanType: "DAILY",   tenureCount: 100, startDate: "2026-01-01", paidSoFar: 24800, due: 0,     closingDate: "2026-04-10", status: "CLOSED" },
    { loanNo: 2, fullName: "Sunita Devi",  fatherOrHusband: "",             currentAddress: "H.No. 5, Chas, Bokaro",       customerMobile: "9000000002", principal: 15000, totalPayable: 18600, installmentAmount: 930,  loanType: "WEEKLY",  tenureCount: 20,  startDate: "2025-12-01", paidSoFar: 9300,  due: 9300,  closingDate: "",            status: "ACTIVE" },
    { loanNo: 3, fullName: "Mohan Singh",  fatherOrHusband: "Lakhan Singh", currentAddress: "Village Jaridih, Bokaro",     customerMobile: "9000000003", principal: 50000, totalPayable: 62000, installmentAmount: 5167, loanType: "MONTHLY", tenureCount: 12,  startDate: "2025-06-01", paidSoFar: 62000, due: 0,     closingDate: "2026-05-01", status: "CLOSED" },
    { loanNo: 4, fullName: "Pooja Sharma", fatherOrHusband: "Geeta Sharma", currentAddress: "H.No. 88, Sector 9, Bokaro",  customerMobile: "9000000004", principal: 10000, totalPayable: 12400, installmentAmount: 124,  loanType: "DAILY",   tenureCount: 100, startDate: "2026-04-01", paidSoFar: 4900,  due: 7500,  closingDate: "",            status: "ACTIVE" },
    { loanNo: 5, fullName: "Rajesh Yadav", fatherOrHusband: "Suresh Yadav", currentAddress: "H.No. 12, Sector 2, Bokaro",  customerMobile: "9000000005", principal: 25000, totalPayable: 31000, installmentAmount: 1240, loanType: "WEEKLY",  tenureCount: 25,  startDate: "2026-02-15", paidSoFar: 11000, due: 20000, closingDate: "",            status: "ACTIVE" },
  ];
}

export async function generateSampleBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  addLoanSheet(wb, buildSampleRows() as Record<string, unknown>[]);
  addNotesSheet(wb);
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

// ─── Workbook reader ───────────────────────────────────────────────────
function readSheet(wb: ExcelJS.Workbook, name: string): Record<string, unknown>[] {
  const ws = wb.getWorksheet(name) ?? wb.worksheets[0];
  if (!ws) return [];
  const headerKeys: (string | undefined)[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    headerKeys[col] = normalizeHeader(String(cell.value ?? ""));
  });
  const rows: Record<string, unknown>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    if (rowNum === 1) return;
    const obj: Record<string, unknown> = {};
    let hasAny = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = headerKeys[col];
      if (!key) return;
      let v: unknown = cell.value;
      if (v && typeof v === "object" && "result" in (v as object)) v = (v as { result: unknown }).result;
      if (v && typeof v === "object" && "text" in (v as object)) v = (v as { text: unknown }).text;
      if (v && typeof v === "object" && (v as Date) instanceof Date === false && "richText" in (v as object)) {
        v = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
      }
      if (v != null && v !== "") {
        obj[key] = v;
        hasAny = true;
      }
    });
    if (hasAny) {
      obj.__rowNum = rowNum;
      rows.push(obj);
    }
  });
  return rows;
}

// ─── Report ────────────────────────────────────────────────────────────
export type ImportOutcome = "OK" | "SKIPPED" | "ERROR";
export type ReportRow = { sheet: string; row: number; key: string; outcome: ImportOutcome; message: string };
export type ImportReport = {
  mode: "dry-run" | "commit";
  totals: { loansRead: number; uniqueCustomers: number; loansWithPriorCollection: number };
  summary: { ok: number; skipped: number; error: number };
  rows: ReportRow[];
};

export type ImportOptions = {
  commit: boolean;
  actorUserId: string;
  defaultBranchId?: string;
  defaultAssignedEmployeeId?: string;
};

// ─── Main entry ────────────────────────────────────────────────────────
export async function runImportFromBuffer(buf: Buffer, opts: ImportOptions): Promise<ImportReport> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const rawLoans = readSheet(wb, "loans");

  const rows: ReportRow[] = [];
  const log = (sheet: string, row: number, key: string, outcome: ImportOutcome, message: string) => {
    rows.push({ sheet, row, key, outcome, message });
  };

  if (rawLoans.length === 0) {
    log("loans", 0, "(file)", "ERROR", "No data rows found. Make sure your sheet has headers on row 1 and data starting on row 2.");
    return finalize(opts.commit ? "commit" : "dry-run", 0, 0, 0, rows);
  }

  // Resolve & validate the operator-selected defaults.
  const branch = opts.defaultBranchId
    ? await prisma.branch.findUnique({ where: { id: opts.defaultBranchId }, select: { id: true, code: true, name: true } })
    : null;
  const assignedEmployee = opts.defaultAssignedEmployeeId
    ? await prisma.user.findUnique({ where: { id: opts.defaultAssignedEmployeeId }, select: { id: true, name: true } })
    : null;

  if (!branch) log("loans", 0, "(setup)", "ERROR", "Please select a branch on the Bulk Import page before running validation.");
  if (!assignedEmployee) log("loans", 0, "(setup)", "ERROR", "Please select an assigned employee on the Bulk Import page before running validation.");
  if (rows.some((r) => r.outcome === "ERROR")) {
    return finalize("dry-run", rawLoans.length, 0, 0, rows);
  }

  // Row-level validation
  const loans = parseAll(rawLoans, loanRowSchema, "loans", log);
  if (rows.some((r) => r.outcome === "ERROR")) {
    return finalize("dry-run", rawLoans.length, 0, 0, rows);
  }

  // Cross-row checks: duplicate Loan No (serial), EMI × tenure ≈ Amount to, etc.
  const seenSerial = new Map<number, number>(); // serial → first row it appeared in
  for (const { row, data } of loans) {
    if (seenSerial.has(data.loanNo)) {
      log("loans", row, `Loan #${data.loanNo}`, "ERROR",
        `Loan No ${data.loanNo} is duplicated (also on row ${seenSerial.get(data.loanNo)}).`);
    } else {
      seenSerial.set(data.loanNo, row);
    }
    const expected = Math.round(data.installmentAmount * data.tenureCount);
    if (Math.abs(expected - Math.round(data.totalPayable)) > data.installmentAmount) {
      log("loans", row, `Loan #${data.loanNo}`, "ERROR",
        `EMI × tenure (${expected}) does not match Amount to (${data.totalPayable}). Check the figures.`);
    }
    if (data.paidSoFar > data.totalPayable + 0.5) {
      log("loans", row, `Loan #${data.loanNo}`, "ERROR",
        `Collection (${data.paidSoFar}) is greater than Amount to (${data.totalPayable}).`);
    }
  }
  if (rows.some((r) => r.outcome === "ERROR")) {
    const uniqueCount = new Set(loans.map((l) => l.data.customerMobile)).size;
    return finalize("dry-run", rawLoans.length, uniqueCount, 0, rows);
  }

  // Pick one customer record per mobile (first wins, but we keep all rows for loans).
  const customerByMobile = new Map<string, LoanRow>();
  for (const { data } of loans) {
    if (!customerByMobile.has(data.customerMobile)) customerByMobile.set(data.customerMobile, data);
  }
  const loansWithPaid = loans.filter((l) => l.data.paidSoFar > 0).length;

  if (!opts.commit) {
    for (const [mobile, c] of customerByMobile) log("loans", 0, mobile, "OK", `would create customer ${c.fullName}`);
    for (const { row, data } of loans) {
      const closed = data.status === "CLOSED" || data.paidSoFar >= data.totalPayable - 0.5;
      const stateNote = closed ? " (CLOSED)" : data.paidSoFar > 0 ? ` (₹${data.paidSoFar} already paid)` : "";
      const unit = data.loanType === "DAILY" ? "days" : data.loanType === "WEEKLY" ? "weeks" : "months";
      log("loans", row, `Loan #${data.loanNo}`, "OK",
        `Loan #${data.loanNo}: would create ${data.loanType} loan ${data.principal} → ${data.totalPayable} over ${data.tenureCount} ${unit}${stateNote}`);
    }
    return finalize("dry-run", rawLoans.length, customerByMobile.size, loansWithPaid, rows);
  }

  // ── COMMIT MODE ──
  const customerIdByMobile = new Map<string, string>();
  const existing = await prisma.customer.findMany({ select: { id: true, mobile: true } });
  for (const c of existing) customerIdByMobile.set(c.mobile, c.id);

  // 1. Customers
  for (const [mobile, c] of customerByMobile) {
    if (customerIdByMobile.has(mobile)) {
      log("loans", 0, mobile, "SKIPPED", `customer ${c.fullName} already exists`);
      continue;
    }
    try {
      const code = await nextCustomerCode();
      const created = await prisma.customer.create({
        data: {
          customerCode: code,
          fullName: c.fullName,
          mobile,
          fatherOrHusband: c.fatherOrHusband,
          currentAddress: c.currentAddress,
          branchId: branch!.id,
          createdById: opts.actorUserId,
        },
      });
      customerIdByMobile.set(mobile, created.id);
      log("loans", 0, code, "OK", `customer ${c.fullName} created`);
    } catch (e) {
      log("loans", 0, mobile, "ERROR", `customer create failed: ${(e as Error).message}`);
    }
  }

  // 2. Loans
  const existingLoans = await prisma.loanAccount.findMany({ select: { id: true, customerId: true, startDate: true } });
  const loanKey = (custId: string, d: Date) => `${custId}|${dayjs.utc(d).format("YYYY-MM-DD")}`;
  const existingLoanKeys = new Set(existingLoans.map((l) => loanKey(l.customerId, l.startDate)));

  for (const { row, data } of loans) {
    const customerId = customerIdByMobile.get(data.customerMobile);
    if (!customerId) {
      log("loans", row, `Loan #${data.loanNo}`, "ERROR", `Loan #${data.loanNo}: customer not created (see earlier errors)`);
      continue;
    }
    const key = loanKey(customerId, data.startDate);
    if (existingLoanKeys.has(key)) {
      log("loans", row, `Loan #${data.loanNo}`, "SKIPPED", `Loan #${data.loanNo}: a loan with this start date already exists for this customer`);
      continue;
    }
    try {
      const loanType: LoanType = data.loanType;
      const calc = buildLoanFromSheet({
        principal: data.principal,
        totalPayable: data.totalPayable,
        installmentAmount: data.installmentAmount,
        tenureCount: data.tenureCount,
        loanType,
        startDate: data.startDate,
        closingDate: data.closingDate,
      });
      const interestRate = deriveAnnualRate(calc.principal, calc.totalPayable, calc.tenureCount, loanType);

      const applicationNo = await nextApplicationNo();
      const accountNo = await nextLoanAccountNo();

      // Build schedule with paid state baked in — avoids per-installment update loop.
      const { rows: scheduleRows, lastFullyPaidDueDate } = buildScheduleRows({
        loanAccountId: "",
        loanType,
        startDate: calc.startDate,
        tenureCount: calc.tenureCount,
        installmentAmount: calc.installmentAmount,
        totalPayable: calc.totalPayable,
        paidSoFar: data.paidSoFar,
      });
      const nextUnpaid = scheduleRows.find((r) => r.status !== "PAID");
      const paidAmount = Math.min(data.paidSoFar, calc.totalPayable);
      const pendingAmount = Math.max(calc.totalPayable - paidAmount, 0);
      const today = dayjs.utc().startOf("day").toDate();
      let finalStatus: LoanStatus = "ACTIVE";
      if (data.status === "CLOSED" || pendingAmount <= 0.001) finalStatus = "CLOSED";
      else if (nextUnpaid && nextUnpaid.dueDate < today) finalStatus = "OVERDUE";
      const receiptNo = data.paidSoFar > 0 ? await nextReceiptNo() : null;

      await prisma.$transaction(async (tx) => {
        const app = await tx.loanApplication.create({
          data: {
            applicationNo, customerId, branchId: branch!.id,
            loanType,
            principal: calc.principal,
            interestRate,
            tenureCount: calc.tenureCount,
            installmentAmount: calc.installmentAmount,
            totalPayable: calc.totalPayable,
            interestAmount: calc.interestAmount,
            startDate: calc.startDate,
            maturityDate: calc.maturityDate,
            source: "STANDARD",
            status: "DISBURSED",
            createdById: opts.actorUserId,
            reviewedById: opts.actorUserId,
            reviewedAt: data.startDate,
            reviewRemark: "Imported from legacy register",
          },
        });
        const acc = await tx.loanAccount.create({
          data: {
            accountNo, applicationId: app.id, customerId, branchId: branch!.id,
            assignedEmployeeId: assignedEmployee!.id,
            loanType,
            principal: calc.principal,
            interestAmount: calc.interestAmount,
            totalPayable: calc.totalPayable,
            installmentAmount: calc.installmentAmount,
            paidAmount,
            pendingAmount,
            disbursedAt: data.startDate,
            disbursementMode: "CASH" as DisbursementMode,
            startDate: calc.startDate,
            maturityDate: calc.maturityDate,
            nextDueDate: nextUnpaid?.dueDate ?? null,
            status: finalStatus,
            closedAt: finalStatus === "CLOSED" ? calc.maturityDate : null,
          },
        });
        await tx.repaymentSchedule.createMany({
          data: scheduleRows.map((r) => ({ ...r, loanAccountId: acc.id })),
        });
        if (receiptNo && data.paidSoFar > 0) {
          await tx.payment.create({
            data: {
              receiptNo,
              loanAccountId: acc.id,
              amount: data.paidSoFar,
              mode: "CASH",
              collectedById: assignedEmployee!.id,
              collectedAt: lastFullyPaidDueDate ?? calc.startDate,
              note: "Imported — aggregated prior collection",
              clientRef: `import-summary-${receiptNo}`,
            },
          });
        }
      }, { timeout: 30000 });

      const paidNote = data.paidSoFar > 0 ? ` (${data.paidSoFar} prior, ${finalStatus})` : ` (${finalStatus})`;
      const unit = loanType === "DAILY" ? "days" : loanType === "WEEKLY" ? "weeks" : "months";
      log("loans", row, `Loan #${data.loanNo}`, "OK",
        `Loan #${data.loanNo} → ${accountNo}: ${loanType} ${calc.principal} → ${calc.totalPayable} over ${calc.tenureCount} ${unit}${paidNote}`);
    } catch (e) {
      log("loans", row, `Loan #${data.loanNo}`, "ERROR", `Loan #${data.loanNo}: ${(e as Error).message}`);
    }
  }

  return finalize("commit", rawLoans.length, customerByMobile.size, loansWithPaid, rows);
}

// ─── Helpers ───────────────────────────────────────────────────────────
function parseAll<S extends z.ZodSchema>(
  rows: Record<string, unknown>[],
  schema: S,
  sheet: string,
  log: (sheet: string, row: number, key: string, outcome: ImportOutcome, message: string) => void,
) {
  const ok: { row: number; data: z.infer<S> }[] = [];
  for (const r of rows) {
    const rowNum = (r.__rowNum as number) ?? 0;
    const result = schema.safeParse(r);
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      log(sheet, rowNum, "(validation)", "ERROR", msg);
    } else {
      ok.push({ row: rowNum, data: result.data });
    }
  }
  return ok;
}

function finalize(mode: "dry-run" | "commit", loansRead: number, uniqueCustomers: number, loansWithPriorCollection: number, rows: ReportRow[]): ImportReport {
  const ok = rows.filter((r) => r.outcome === "OK").length;
  const skipped = rows.filter((r) => r.outcome === "SKIPPED").length;
  const error = rows.filter((r) => r.outcome === "ERROR").length;
  return { mode, totals: { loansRead, uniqueCustomers, loansWithPriorCollection }, summary: { ok, skipped, error }, rows };
}
