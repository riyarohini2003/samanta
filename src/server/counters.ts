import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

/** Atomically increment and return the next sequence value for a key. */
export async function nextSeq(
  key: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx ?? prisma;
  const row = await client.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return row.value;
}

function pad(n: number, width: number) {
  return n.toString().padStart(width, "0");
}

export async function nextEmployeeCode(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("employee", tx);
  return `EMP${pad(n, 5)}`;
}

export async function nextBranchCode(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("branch", tx);
  return `BR${pad(n, 3)}`;
}

export async function nextCustomerCode(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("customer", tx);
  return `CUS${pad(n, 6)}`;
}

export async function nextApplicationNo(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("application", tx);
  const year = new Date().getFullYear();
  return `APP-${year}-${pad(n, 5)}`;
}

export async function nextLoanAccountNo(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("loanAccount", tx);
  const year = new Date().getFullYear();
  return `LN-${year}-${pad(n, 5)}`;
}

export async function nextReceiptNo(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("receipt", tx);
  const year = new Date().getFullYear();
  return `RCP-${year}-${pad(n, 6)}`;
}

export async function nextInvestorCode(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("investor", tx);
  return `INV${pad(n, 5)}`;
}

export async function nextInvestmentCode(tx?: Prisma.TransactionClient) {
  const n = await nextSeq("investment", tx);
  const year = new Date().getFullYear();
  return `INVT-${year}-${pad(n, 5)}`;
}
