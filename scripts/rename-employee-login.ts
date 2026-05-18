/**
 * One-shot: rename an employee's loginId and set their mobile number so they
 * can sign in with either identifier. After the recent login-route fix, the
 * login flow tries loginId first, then falls back to the mobile field for
 * 10-digit inputs — so setting both gives the user two valid login IDs.
 *
 * Usage:
 *   npx tsx scripts/rename-employee-login.ts <currentLoginId> <newLoginId> <mobile>
 * Example:
 *   npx tsx scripts/rename-employee-login.ts 9771219353 kundan 9771219353
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [currentLoginId, newLoginId, mobile] = process.argv.slice(2);
  if (!currentLoginId || !newLoginId || !mobile) {
    console.error("Usage: tsx scripts/rename-employee-login.ts <currentLoginId> <newLoginId> <mobile>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { loginId: currentLoginId, deletedAt: { isSet: false } },
  });
  if (!user) {
    console.error(`No active user found with loginId="${currentLoginId}"`);
    process.exit(1);
  }

  const clash = await prisma.user.findFirst({
    where: { loginId: newLoginId, id: { not: user.id }, deletedAt: { isSet: false } },
  });
  if (clash) {
    console.error(`loginId "${newLoginId}" is already taken by user ${clash.id} (${clash.name}).`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { loginId: newLoginId, mobile },
  });

  console.log(
    `Updated ${updated.employeeCode} (${updated.name}): loginId="${updated.loginId}", mobile="${updated.mobile}".`,
  );
  console.log(`They can now sign in with either "${newLoginId}" or "${mobile}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
