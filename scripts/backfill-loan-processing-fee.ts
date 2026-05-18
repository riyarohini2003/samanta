/**
 * One-off backfill: copies LoanApplication.processingFee onto LoanAccount.processingFee.
 *
 * Run AFTER the schema change has been pushed and the Prisma client regenerated:
 *   npx prisma generate
 *   npx prisma db push
 *   npx tsx scripts/backfill-loan-processing-fee.ts
 *
 * Safe to re-run — only updates accounts whose processingFee differs from the
 * linked application's processingFee.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const startedAt = new Date();
  console.log(`[backfill] processingFee starting at ${startedAt.toISOString()}`);

  const accounts = await prisma.loanAccount.findMany({
    select: {
      id: true,
      accountNo: true,
      processingFee: true,
      application: { select: { processingFee: true } },
    },
  });

  let updated = 0;
  let skipped = 0;
  for (const acc of accounts) {
    const appFee = Number(acc.application?.processingFee ?? 0);
    const accFee = Number(acc.processingFee ?? 0);
    if (appFee === accFee) {
      skipped++;
      continue;
    }
    await prisma.loanAccount.update({
      where: { id: acc.id },
      data: { processingFee: appFee },
    });
    updated++;
    console.log(`[backfill] ${acc.accountNo}: ${accFee} → ${appFee}`);
  }

  console.log(`[backfill] done. updated=${updated} skipped=${skipped} total=${accounts.length}`);
}

main()
  .catch((err) => {
    console.error("[backfill] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
