import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { scopeWhere, isAdmin } from "@/server/auth/guards";
import { ok, unauthorized, handleError } from "@/lib/api";
import dayjs from "@/lib/dayjs";
import { toNumber } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const sp = req.nextUrl.searchParams;
    const fromStr =
      sp.get("from") && /^\d{4}-\d{2}-\d{2}$/.test(sp.get("from")!)
        ? sp.get("from")!
        : dayjs().startOf("month").format("YYYY-MM-DD");
    const toStr =
      sp.get("to") && /^\d{4}-\d{2}-\d{2}$/.test(sp.get("to")!)
        ? sp.get("to")!
        : dayjs().format("YYYY-MM-DD");
    const from = dayjs.utc(fromStr).startOf("day").toDate();
    const to = dayjs.utc(toStr).endOf("day").toDate();

    const adminUser = isAdmin(user);
    const requestedBranchId = sp.get("branchId")?.trim() || "";
    const branchFilter = adminUser
      ? requestedBranchId
        ? { branchId: requestedBranchId }
        : {}
      : { branchId: user.branchId ?? "__none__" };

    const scope = scopeWhere(user);

    // Resolve branch label for filter display
    let branchLabel = "All Branches";
    if (adminUser && requestedBranchId) {
      const b = await prisma.branch.findUnique({
        where: { id: requestedBranchId },
        select: { code: true, name: true },
      });
      if (b) branchLabel = `${b.code} — ${b.name}`;
    } else if (!adminUser && user.branchId) {
      const b = await prisma.branch.findUnique({
        where: { id: user.branchId },
        select: { code: true, name: true },
      });
      if (b) branchLabel = `${b.code} — ${b.name}`;
    }

    const [disbursements, payments] = await Promise.all([
      prisma.loanAccount.findMany({
        where: {
          disbursedAt: { gte: from, lte: to },
          ...scope,
          ...branchFilter,
        },
        orderBy: { disbursedAt: "desc" },
        select: {
          id: true,
          accountNo: true,
          principal: true,
          interestAmount: true,
          totalPayable: true,
          installmentAmount: true,
          disbursedAt: true,
          disbursementMode: true,
          loanType: true,
          maturityDate: true,
          application: { select: { processingFee: true, interestRate: true } },
          customer: {
            select: { fullName: true, customerCode: true, mobile: true },
          },
          branch: { select: { code: true, name: true } },
          assignedEmployee: { select: { name: true, employeeCode: true } },
        },
      }),
      prisma.payment.findMany({
        where: {
          collectedAt: { gte: from, lte: to },
          isReversed: false,
          loanAccount: { ...scope, ...branchFilter },
        },
        orderBy: { collectedAt: "desc" },
        include: {
          loanAccount: {
            select: {
              accountNo: true,
              loanType: true,
              customer: {
                select: { fullName: true, customerCode: true, mobile: true },
              },
              branch: { select: { code: true, name: true } },
            },
          },
          collectedBy: { select: { name: true, employeeCode: true } },
        },
      }),
    ]);

    const disbursementRows = disbursements.map((l) => ({
      date: dayjs(l.disbursedAt).format("DD MMM YYYY"),
      accountNo: l.accountNo,
      customerCode: l.customer.customerCode,
      customer: l.customer.fullName,
      mobile: l.customer.mobile ?? "",
      branch: `${l.branch.code} — ${l.branch.name}`,
      loanType: l.loanType,
      mode: l.disbursementMode,
      principal: toNumber(l.principal),
      interest: toNumber(l.interestAmount),
      totalPayable: toNumber(l.totalPayable),
      emi: toNumber(l.installmentAmount),
      processingFee: toNumber(l.application?.processingFee),
      interestRate: toNumber(l.application?.interestRate),
      maturity: l.maturityDate
        ? dayjs(l.maturityDate).format("DD MMM YYYY")
        : "",
      employee: l.assignedEmployee?.name ?? "",
      employeeCode: l.assignedEmployee?.employeeCode ?? "",
    }));

    const collectionRows = payments.map((p) => ({
      when: dayjs(p.collectedAt).format("DD MMM YYYY HH:mm"),
      receiptNo: p.receiptNo,
      customerCode: p.loanAccount.customer.customerCode,
      customer: p.loanAccount.customer.fullName,
      mobile: p.loanAccount.customer.mobile ?? "",
      accountNo: p.loanAccount.accountNo,
      branch: `${p.loanAccount.branch.code} — ${p.loanAccount.branch.name}`,
      loanType: p.loanAccount.loanType,
      mode: p.mode,
      amount: toNumber(p.amount),
      penalty: toNumber(p.penalty),
      collectedBy: p.collectedBy.name,
      collectedByCode: p.collectedBy.employeeCode,
    }));

    const totalDisbursed = disbursementRows.reduce(
      (s, r) => s + r.principal,
      0,
    );
    const totalProcessingFees = disbursementRows.reduce(
      (s, r) => s + r.processingFee,
      0,
    );
    const totalCollections = collectionRows.reduce((s, r) => s + r.amount, 0);
    const totalPenalty = collectionRows.reduce((s, r) => s + r.penalty, 0);

    return ok({
      filters: {
        From: dayjs(fromStr).format("DD MMM YYYY"),
        To: dayjs(toStr).format("DD MMM YYYY"),
        Branch: branchLabel,
      },
      generatedAt: dayjs().format("DD MMM YYYY HH:mm"),
      disbursements: disbursementRows,
      collections: collectionRows,
      summary: {
        "Disbursements (count)": disbursementRows.length,
        "Total Disbursed": totalDisbursed,
        "Processing Fees": totalProcessingFees,
        "Collections (count)": collectionRows.length,
        "Total Collections": totalCollections,
        "Penalty Collected": totalPenalty,
        "Net Cash Flow": totalCollections - totalDisbursed,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
