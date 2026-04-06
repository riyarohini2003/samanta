const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const rows = await p.branch.findMany({
    where: { deletedAt: { isSet: false } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, loans: true, customers: true } } },
  });
  console.log("count:", rows.length);
  for (const r of rows) {
    console.log(" -", r.code, r.name, "| users:", r._count.users, "customers:", r._count.customers, "loans:", r._count.loans);
  }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
