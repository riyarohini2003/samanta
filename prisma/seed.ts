/* Seed script — creates CEO account, branches, employees, customers, loans, and default settings.
   All sample data is read from prisma/seed-data.json — edit that file to change seed values. */
import { PrismaClient, LoanType, DisbursementMode, PaymentMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { readFileSync } from "fs";

dayjs.extend(utc);
import { join } from "path";

const prisma = new PrismaClient();

// ─── Load seed data from JSON ──────────────────────────────────────────
type SeedData = {
  branches: { name: string; city: string; state: string; pincode: string }[];
  employeeFirstNames: string[];
  employeeLastNames: string[];
  employeesPerBranch: number;
  defaultEmployeePassword: string;
  customerFirstNames: string[];
  customerLastNames: string[];
  customersPerBranch: number;
  occupations: string[];
  customerIncomeRange: { min: number; max: number };
  loanChance: number;
  annualInterestRate: number;
  loanTypes: Record<string, {
    principalMin: number;
    principalMax: number;
    tenureCount: number;
    daysBackMin: number;
    daysBackMax: number;
  }>;
  paymentSkipChance: number;
  defaultSettings: Record<string, object>;
};

const seedData: SeedData = JSON.parse(
  readFileSync(join(__dirname, "seed-data.json"), "utf-8")
);

// ─── Helpers ───────────────────────────────────────────────────────────
function pad(n: number, w: number) {
  return n.toString().padStart(w, "0");
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🌱 Seeding Samanta LMS...");

  // Reset — wipe all collections in FK-safe order
  await prisma.payment.deleteMany();
  await prisma.repaymentSchedule.deleteMany();
  await prisma.loanAccount.deleteMany();
  await prisma.loanAppDocument.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.customerDocument.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.setting.deleteMany();

  const adminLogin = process.env.SEED_ADMIN_LOGIN || "admin";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const adminName = process.env.SEED_ADMIN_NAME || "Aditya RJ";
  const adminMobile = process.env.SEED_ADMIN_MOBILE || "9999999999";

  // 1. CEO (Aditya RJ)
  await prisma.user.upsert({
    where: { loginId: adminLogin },
    update: {},
    create: {
      employeeCode: "CEO01",
      loginId: adminLogin,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: adminName,
      mobile: adminMobile,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  await prisma.counter.upsert({ where: { key: "employee" }, update: { value: 1 }, create: { key: "employee", value: 1 } });

  // 2. Branches (from seed-data.json)
  const branches = [] as Array<Awaited<ReturnType<typeof prisma.branch.create>>>;
  for (let i = 0; i < seedData.branches.length; i++) {
    const b = seedData.branches[i];
    const branch = await prisma.branch.create({
      data: {
        code: `BR${pad(i + 1, 3)}`,
        name: b.name,
        address: `${b.name} Branch Office, Main Road`,
        city: b.city,
        state: b.state,
        pincode: b.pincode,
        contactNumber: `022${pad(randInt(10000000, 99999999), 8)}`.slice(0, 10),
      },
    });
    branches.push(branch);
  }
  await prisma.counter.upsert({ where: { key: "branch" }, update: { value: branches.length }, create: { key: "branch", value: branches.length } });

  // 3. Employees (from seed-data.json name pools)
  const employees = [] as Array<Awaited<ReturnType<typeof prisma.user.create>>>;
  let empNo = 2;
  for (const branch of branches) {
    for (let i = 0; i < seedData.employeesPerBranch; i++) {
      const role = i === 0 ? "BRANCH_MANAGER" : "EMPLOYEE";
      const name = `${pick(seedData.employeeFirstNames)} ${pick(seedData.employeeLastNames)}`;
      const loginId = `${name.toLowerCase().replace(" ", ".")}${empNo}`;
      const emp = await prisma.user.create({
        data: {
          employeeCode: `EMP${pad(empNo, 5)}`,
          loginId,
          email: `${loginId}@samanta.local`,
          passwordHash: await bcrypt.hash(seedData.defaultEmployeePassword, 10),
          name,
          mobile: `9${pad(randInt(100000000, 999999999), 9)}`.slice(0, 10),
          role,
          branchId: branch.id,
          joiningDate: dayjs.utc().subtract(randInt(30, 365), "day").startOf("day").toDate(),
        },
      });
      employees.push(emp);
      empNo++;
    }
  }
  await prisma.counter.upsert({ where: { key: "employee" }, update: { value: empNo - 1 }, create: { key: "employee", value: empNo - 1 } });

  // 4. Customers (from seed-data.json name pools & occupations)
  const customers = [] as Array<Awaited<ReturnType<typeof prisma.customer.create>>>;
  let custNo = 1;
  for (const branch of branches) {
    for (let i = 0; i < seedData.customersPerBranch; i++) {
      const fullName = `${pick(seedData.customerFirstNames)} ${pick(seedData.customerLastNames)}`;
      const creator = pick(employees.filter((e) => e.branchId === branch.id));
      const c = await prisma.customer.create({
        data: {
          customerCode: `CUS${pad(custNo, 6)}`,
          fullName,
          mobile: `8${pad(randInt(100000000, 999999999), 9)}`.slice(0, 10),
          aadhaar: pad(custNo, 12),
          currentAddress: `H.No. ${randInt(1, 500)}, ${branch.city}`,
          occupation: pick(seedData.occupations),
          monthlyIncome: randInt(seedData.customerIncomeRange.min, seedData.customerIncomeRange.max),
          branchId: branch.id,
          createdById: creator.id,
          gender: Math.random() > 0.5 ? "MALE" : "FEMALE",
          guarantorName: `${pick(seedData.customerFirstNames)} ${pick(seedData.customerLastNames)}`,
          guarantorMobile: `9${pad(randInt(100000000, 999999999), 9)}`.slice(0, 10),
        },
      });
      customers.push(c);
      custNo++;
    }
  }
  await prisma.counter.upsert({ where: { key: "customer" }, update: { value: custNo - 1 }, create: { key: "customer", value: custNo - 1 } });

  // 5. Loans — mix of daily/weekly/monthly, disbursed at various past dates so there are dues today
  let appNo = 1;
  let loanNo = 1;
  let receiptNo = 1;
  const year = new Date().getFullYear();
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) throw new Error("No admin");

  const loanTypeKeys = Object.keys(seedData.loanTypes) as LoanType[];

  for (const customer of customers) {
    if (Math.random() > seedData.loanChance) continue;

    const loanType: LoanType = pick(loanTypeKeys);
    const ltConfig = seedData.loanTypes[loanType];
    const principal = randInt(ltConfig.principalMin, ltConfig.principalMax);
    const tenureCount = ltConfig.tenureCount;
    const annualRate = seedData.annualInterestRate;
    const tenureYears = loanType === "DAILY" ? tenureCount / 365 : loanType === "WEEKLY" ? (tenureCount * 7) / 365 : tenureCount / 12;
    const interestAmount = Math.round(principal * (annualRate / 100) * tenureYears * 100) / 100;
    const totalPayable = Math.round(principal + interestAmount);
    const installmentAmount = Math.round(totalPayable / tenureCount);

    const daysBack = randInt(ltConfig.daysBackMin, ltConfig.daysBackMax);
    const startDate = dayjs.utc().subtract(daysBack, "day").startOf("day").toDate();
    const maturityDate = dayjs.utc(startDate).add(tenureCount - 1, loanType === "DAILY" ? "day" : loanType === "WEEKLY" ? "week" : "month").startOf("day").toDate();

    const assigned = pick(employees.filter((e) => e.branchId === customer.branchId && e.role === "EMPLOYEE"));

    const app = await prisma.loanApplication.create({
      data: {
        applicationNo: `APP-${year}-${pad(appNo++, 5)}`,
        customerId: customer.id,
        branchId: customer.branchId,
        loanType,
        principal,
        interestRate: annualRate,
        processingFee: 0,
        tenureCount,
        installmentAmount,
        totalPayable,
        interestAmount,
        startDate,
        maturityDate,
        status: "DISBURSED",
        createdById: assigned.id,
        reviewedById: admin.id,
        reviewedAt: dayjs.utc(startDate).subtract(1, "day").toDate(),
        reviewRemark: "Approved",
      },
    });

    const account = await prisma.loanAccount.create({
      data: {
        accountNo: `LN-${year}-${pad(loanNo++, 5)}`,
        applicationId: app.id,
        customerId: customer.id,
        branchId: customer.branchId,
        assignedEmployeeId: assigned.id,
        loanType,
        principal,
        interestAmount,
        totalPayable,
        installmentAmount,
        pendingAmount: totalPayable,
        disbursedAt: startDate,
        disbursementMode: "CASH" as DisbursementMode,
        startDate,
        maturityDate,
        nextDueDate: startDate,
      },
    });

    // Generate schedule
    const scheduleRows = [];
    const normal = installmentAmount;
    const lastAmount = Math.round((totalPayable - normal * (tenureCount - 1)) * 100) / 100;
    for (let i = 1; i <= tenureCount; i++) {
      const dueDate = dayjs.utc(startDate).add(i - 1, loanType === "DAILY" ? "day" : loanType === "WEEKLY" ? "week" : "month").startOf("day").toDate();
      scheduleRows.push({
        loanAccountId: account.id,
        installmentNo: i,
        dueDate,
        dueAmount: i === tenureCount ? lastAmount : normal,
      });
    }
    await prisma.repaymentSchedule.createMany({ data: scheduleRows });

    // Simulate some past payments (pay ~60% of installments that are due before today)
    const today = dayjs.utc().startOf("day");
    const pastInstallments = scheduleRows.filter((r) => dayjs(r.dueDate).isBefore(today));
    let paidSoFar = 0;
    for (const row of pastInstallments) {
      if (Math.random() < seedData.paymentSkipChance) continue; // skip some → creates overdue
      const scheduleRecord = await prisma.repaymentSchedule.findFirst({
        where: { loanAccountId: account.id, installmentNo: row.installmentNo },
      });
      if (!scheduleRecord) continue;
      const rcp = `RCP-${year}-${pad(receiptNo++, 6)}`;
      await prisma.payment.create({
        data: {
          receiptNo: rcp,
          loanAccountId: account.id,
          scheduleId: scheduleRecord.id,
          amount: row.dueAmount,
          mode: "CASH" as PaymentMode,
          collectedById: assigned.id,
          collectedAt: dayjs.utc(row.dueDate).add(randInt(0, 2), "hour").toDate(),
          clientRef: `seed-${rcp}`,
        },
      });
      await prisma.repaymentSchedule.update({
        where: { id: scheduleRecord.id },
        data: { paidAmount: row.dueAmount, status: "PAID", paidAt: dayjs.utc(row.dueDate).toDate() },
      });
      paidSoFar += Number(row.dueAmount);
    }

    // Update loan aggregates
    const nextUnpaid = await prisma.repaymentSchedule.findFirst({
      where: { loanAccountId: account.id, status: { in: ["PENDING", "PARTIAL", "MISSED"] } },
      orderBy: { dueDate: "asc" },
    });
    await prisma.loanAccount.update({
      where: { id: account.id },
      data: {
        paidAmount: paidSoFar,
        pendingAmount: Math.max(totalPayable - paidSoFar, 0),
        nextDueDate: nextUnpaid?.dueDate ?? null,
      },
    });
  }

  await prisma.counter.upsert({ where: { key: "application" }, update: { value: appNo - 1 }, create: { key: "application", value: appNo - 1 } });
  await prisma.counter.upsert({ where: { key: "loanAccount" }, update: { value: loanNo - 1 }, create: { key: "loanAccount", value: loanNo - 1 } });
  await prisma.counter.upsert({ where: { key: "receipt" }, update: { value: receiptNo - 1 }, create: { key: "receipt", value: receiptNo - 1 } });

  // 6. Seed default settings into MongoDB
  for (const [key, value] of Object.entries(seedData.defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: {},
    });
  }

  console.log(`✅ Seed complete!`);
  console.log(`   Branches: ${branches.length}`);
  console.log(`   Employees: ${employees.length + 1} (incl. CEO)`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Loans:    ${loanNo - 1}`);
  console.log(`   Settings: ${Object.keys(seedData.defaultSettings).length} sections`);
  console.log();
  console.log(`   Admin login: ${adminLogin} / ${adminPassword}`);
  console.log(`   Employee pwd: ${seedData.defaultEmployeePassword}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
