/**
 * One-off backfill: sets processingFee = round(principal * 5%) on every
 * LoanApplication and LoanAccount.
 *
 * Run:
 *   npx tsx scripts/backfill-processing-fee-5pct.ts
 *
 * Safe to re-run — rows whose fee already matches the computed value are skipped.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RATE = 0.05;
const computeFee = (principal: number) => Math.round((principal || 0) * RATE);

async function backfillApplications() {
  const apps = await prisma.loanApplication.findMany({
    select: { id: true, applicationNo: true, principal: true, processingFee: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const a of apps) {
    const target = computeFee(Number(a.principal));
    const current = Number(a.processingFee ?? 0);
    if (current === target) { skipped++; continue; }
    await prisma.loanApplication.update({ where: { id: a.id }, data: { processingFee: target } });
    console.log(`[app] ${a.applicationNo}: ${current} -> ${target} (principal ${a.principal})`);
    updated++;
  }
  console.log(`[app] done. updated=${updated} skipped=${skipped} total=${apps.length}`);
}

async function backfillAccounts() {
  const accs = await prisma.loanAccount.findMany({
    select: { id: true, accountNo: true, principal: true, processingFee: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const a of accs) {
    const target = computeFee(Number(a.principal));
    const current = Number(a.processingFee ?? 0);
    if (current === target) { skipped++; continue; }
    await prisma.loanAccount.update({ where: { id: a.id }, data: { processingFee: target } });
    console.log(`[acc] ${a.accountNo}: ${current} -> ${target} (principal ${a.principal})`);
    updated++;
  }
  console.log(`[acc] done. updated=${updated} skipped=${skipped} total=${accs.length}`);
}

async function main() {
  const startedAt = new Date();
  console.log(`[backfill 5%] starting at ${startedAt.toISOString()}`);
  await backfillApplications();
  await backfillAccounts();
  console.log(`[backfill 5%] finished in ${Date.now() - startedAt.getTime()}ms`);
}

main()
  .catch((err) => { console.error("[backfill 5%] failed:", err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
