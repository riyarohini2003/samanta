/**
 * One-shot bulk-import CLI.
 * Usage: npx tsx scripts/bulk-import-cli.ts <file.xlsx> <branchCode> <employeeCode>
 * Example: npx tsx scripts/bulk-import-cli.ts Data.xlsx BR001 EMP00001
 *
 * Runs a dry-run first; if zero errors, automatically re-runs with commit=true.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/server/db";
import { runImportFromBuffer, type ImportReport } from "@/server/services/bulk-import-service";

function printReport(label: string, r: ImportReport) {
  console.log(`\n=== ${label} (${r.mode}) ===`);
  console.log(`Loans read:            ${r.totals.loansRead}`);
  console.log(`Unique customers:      ${r.totals.uniqueCustomers}`);
  console.log(`Loans w/ prior coll.:  ${r.totals.loansWithPriorCollection}`);
  console.log(`OK / Skipped / Error:  ${r.summary.ok} / ${r.summary.skipped} / ${r.summary.error}`);
  const errs = r.rows.filter((x) => x.outcome === "ERROR");
  const skips = r.rows.filter((x) => x.outcome === "SKIPPED");
  if (errs.length) {
    console.log(`\nErrors (${errs.length}):`);
    for (const e of errs) console.log(`  [${e.sheet} row ${e.row}] ${e.key}: ${e.message}`);
  }
  if (skips.length) {
    console.log(`\nSkipped (${skips.length}):`);
    for (const s of skips.slice(0, 50)) console.log(`  [${s.sheet} row ${s.row}] ${s.key}: ${s.message}`);
    if (skips.length > 50) console.log(`  …and ${skips.length - 50} more`);
  }
}

async function main() {
  const [, , filePathArg, branchCodeArg, employeeCodeArg] = process.argv;
  if (!filePathArg || !branchCodeArg || !employeeCodeArg) {
    console.error("Usage: npx tsx scripts/bulk-import-cli.ts <file.xlsx> <branchCode> <employeeCode>");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), filePathArg);
  const buf = readFileSync(filePath);
  console.log(`Loaded ${filePath} (${(buf.length / 1024).toFixed(1)} KB)`);

  const branch = await prisma.branch.findFirst({
    where: { code: branchCodeArg, isActive: true, deletedAt: { isSet: false } },
    select: { id: true, code: true, name: true },
  });
  if (!branch) throw new Error(`Branch with code "${branchCodeArg}" not found (or inactive/deleted)`);

  const employee = await prisma.user.findFirst({
    where: { employeeCode: employeeCodeArg, isActive: true, deletedAt: { isSet: false } },
    select: { id: true, employeeCode: true, name: true, role: true, branchId: true },
  });
  if (!employee) throw new Error(`Employee "${employeeCodeArg}" not found (or inactive/deleted)`);

  const admin = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true, deletedAt: { isSet: false } },
    select: { id: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("No active SUPER_ADMIN/ADMIN user found to use as actor");

  console.log(`Branch:   ${branch.code} — ${branch.name}`);
  console.log(`Employee: ${employee.employeeCode} — ${employee.name} (${employee.role})`);
  console.log(`Actor:    ${admin.role} — ${admin.name}`);

  const dry = await runImportFromBuffer(buf, {
    commit: false,
    actorUserId: admin.id,
    defaultBranchId: branch.id,
    defaultAssignedEmployeeId: employee.id,
  });
  printReport("DRY-RUN", dry);

  if (dry.summary.error > 0) {
    console.log(`\nDry-run had ${dry.summary.error} error(s) — NOT committing. Fix the sheet and re-run.`);
    process.exit(2);
  }

  console.log(`\nDry-run clean. Committing…`);
  const live = await runImportFromBuffer(buf, {
    commit: true,
    actorUserId: admin.id,
    defaultBranchId: branch.id,
    defaultAssignedEmployeeId: employee.id,
  });
  printReport("COMMIT", live);

  if (live.summary.error > 0) {
    console.log(`\nCommit reported ${live.summary.error} error(s). Review carefully.`);
    process.exit(3);
  }
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("Bulk import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
