import { prisma } from "@/server/db";

/**
 * Returns the chronological serial of a loan within its customer's loans
 * (1 for the first loan, 2 for the second, …). Ordered by createdAt asc,
 * tie-broken by id to keep results stable.
 */
export async function getLoanSerial(loanId: string): Promise<number> {
  const loan = await prisma.loanAccount.findUnique({
    where: { id: loanId },
    select: { customerId: true, createdAt: true },
  });
  if (!loan) return 0;
  return prisma.loanAccount.count({
    where: {
      customerId: loan.customerId,
      OR: [
        { createdAt: { lt: loan.createdAt } },
        { createdAt: loan.createdAt, id: { lte: loanId } },
      ],
    },
  });
}

/**
 * Batch version — builds a Map<loanId, serial> in a single round-trip
 * per visible customer. Used by list views.
 */
export async function getLoanSerialMap(loanIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (loanIds.length === 0) return result;

  const seeds = await prisma.loanAccount.findMany({
    where: { id: { in: loanIds } },
    select: { customerId: true },
  });
  const customerIds = Array.from(new Set(seeds.map((s) => s.customerId)));
  if (customerIds.length === 0) return result;

  const allLoans = await prisma.loanAccount.findMany({
    where: { customerId: { in: customerIds } },
    select: { id: true, customerId: true, createdAt: true },
    orderBy: [{ customerId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const seq = new Map<string, number>();
  for (const l of allLoans) {
    const next = (seq.get(l.customerId) ?? 0) + 1;
    seq.set(l.customerId, next);
    result.set(l.id, next);
  }
  return result;
}

/** Predicted serial for a *new* loan for a customer = existing loan count + 1. */
export async function getNextLoanSerialForCustomer(customerId: string): Promise<number> {
  const count = await prisma.loanAccount.count({ where: { customerId } });
  return count + 1;
}

/** Predicted serials for a batch of customers, returned as Map<customerId, nextSerial>. */
export async function getNextLoanSerialMap(customerIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (customerIds.length === 0) return result;
  const grouped = await prisma.loanAccount.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customerIds } },
    _count: { _all: true },
  });
  for (const cid of customerIds) result.set(cid, 1);
  for (const g of grouped) result.set(g.customerId, g._count._all + 1);
  return result;
}

/**
 * Serial number to display for a loan application:
 * - Disbursed application → the actual serial of its LoanAccount.
 * - Rejected application → 0 (no badge).
 * - Pending application → existingLoanCount + position among the customer's
 *   non-rejected, non-disbursed applications (ordered by createdAt asc, id asc).
 *
 * This ensures multiple pending applications for the same customer get
 * distinct serials reflecting the order in which they will be disbursed.
 */
export async function getApplicationSerial(applicationId: string): Promise<number> {
  const app = await prisma.loanApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      customerId: true,
      createdAt: true,
      status: true,
      loanAccount: { select: { id: true } },
    },
  });
  if (!app) return 0;
  if (app.loanAccount) return getLoanSerial(app.loanAccount.id);
  if (app.status === "REJECTED") return 0;

  const [loanCount, earlierCount] = await Promise.all([
    prisma.loanAccount.count({ where: { customerId: app.customerId } }),
    prisma.loanApplication.count({
      where: {
        customerId: app.customerId,
        status: { notIn: ["REJECTED", "DISBURSED"] },
        OR: [
          { createdAt: { lt: app.createdAt } },
          { createdAt: app.createdAt, id: { lt: applicationId } },
        ],
      },
    }),
  ]);
  return loanCount + earlierCount + 1;
}

/** Batch version of getApplicationSerial — returns Map<applicationId, serial>. */
export async function getApplicationSerialMap(applicationIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (applicationIds.length === 0) return result;

  const apps = await prisma.loanApplication.findMany({
    where: { id: { in: applicationIds } },
    select: {
      id: true,
      customerId: true,
      status: true,
      loanAccount: { select: { id: true } },
    },
  });
  const customerIds = Array.from(new Set(apps.map((a) => a.customerId)));
  if (customerIds.length === 0) return result;

  const [allLoans, allApps] = await Promise.all([
    prisma.loanAccount.findMany({
      where: { customerId: { in: customerIds } },
      select: { id: true, customerId: true, createdAt: true },
      orderBy: [{ customerId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.loanApplication.findMany({
      where: {
        customerId: { in: customerIds },
        status: { notIn: ["REJECTED", "DISBURSED"] },
      },
      select: { id: true, customerId: true, createdAt: true },
      orderBy: [{ customerId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const loanSerialByAccount = new Map<string, number>();
  const loanCountByCustomer = new Map<string, number>();
  for (const l of allLoans) {
    const next = (loanCountByCustomer.get(l.customerId) ?? 0) + 1;
    loanCountByCustomer.set(l.customerId, next);
    loanSerialByAccount.set(l.id, next);
  }

  const appPosByCustomer = new Map<string, number>();
  const appPosById = new Map<string, number>();
  for (const a of allApps) {
    const next = (appPosByCustomer.get(a.customerId) ?? 0) + 1;
    appPosByCustomer.set(a.customerId, next);
    appPosById.set(a.id, next);
  }

  for (const a of apps) {
    if (a.loanAccount) {
      result.set(a.id, loanSerialByAccount.get(a.loanAccount.id) ?? 0);
    } else if (a.status === "REJECTED") {
      result.set(a.id, 0);
    } else {
      const loanCount = loanCountByCustomer.get(a.customerId) ?? 0;
      const pos = appPosById.get(a.id) ?? 1;
      result.set(a.id, loanCount + pos);
    }
  }
  return result;
}
