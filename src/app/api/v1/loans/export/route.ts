import { NextRequest, NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { loanScopeWhere } from "@/server/auth/guards";
import { unauthorized, forbidden, handleError } from "@/lib/api";
import { generateExportBuffer } from "@/server/services/bulk-import-service";
import type { LoanStatus, LoanType } from "@prisma/client";

dayjs.extend(utc);

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const VALID_STATUS: LoanStatus[] = ["ACTIVE", "OVERDUE", "CLOSED"];
const VALID_TYPE: LoanType[] = ["DAILY", "WEEKLY", "MONTHLY"];

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return dayjs.utc(d).format("YYYY-MM-DD");
}

function parseCsv(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();

    const sp = req.nextUrl.searchParams;
    const statusList = parseCsv(sp.get("status")).filter((s): s is LoanStatus =>
      VALID_STATUS.includes(s as LoanStatus),
    );
    const typeList = parseCsv(sp.get("type")).filter((t): t is LoanType =>
      VALID_TYPE.includes(t as LoanType),
    );
    const branchList = parseCsv(sp.get("branch"));
    const officerList = parseCsv(sp.get("officer"));

    const where: Record<string, unknown> = { ...loanScopeWhere(me) };
    if (statusList.length) where.status = { in: statusList };
    if (typeList.length) where.loanType = { in: typeList };
    if (branchList.length) where.branchId = { in: branchList };
    if (officerList.length) where.assignedEmployeeId = { in: officerList };

    const loans = await prisma.loanAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            fullName: true,
            fatherOrHusband: true,
            currentAddress: true,
            mobile: true,
          },
        },
        application: { select: { tenureCount: true } },
      },
    });

    const rows = loans.map((l, idx) => {
      const closed = l.status === "CLOSED";
      return {
        loanNo: idx + 1,
        accountNo: l.accountNo,
        fullName: l.customer.fullName,
        fatherOrHusband: l.customer.fatherOrHusband ?? "",
        currentAddress: l.customer.currentAddress,
        customerMobile: l.customer.mobile,
        principal: Number(l.principal),
        totalPayable: Number(l.totalPayable),
        processingFee: Number(l.processingFee),
        installmentAmount: Number(l.installmentAmount),
        loanType: l.loanType,
        tenureCount: l.application?.tenureCount ?? 0,
        startDate: fmtDate(l.startDate),
        paidSoFar: Number(l.paidAmount),
        due: Number(l.pendingAmount),
        closingDate: closed ? fmtDate(l.closedAt ?? l.maturityDate) : "",
        status: closed ? "CLOSED" : "ACTIVE",
      };
    });

    const buf = await generateExportBuffer(rows as Record<string, unknown>[]);

    const parts: string[] = ["loan-accounts"];
    if (typeList.length) parts.push(typeList.join("-").toLowerCase());
    if (statusList.length) parts.push(statusList.join("-").toLowerCase());
    parts.push(dayjs().format("YYYYMMDD-HHmm"));
    const fileName = `${parts.join("_")}.xlsx`;

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return e.status === 401 ? unauthorized() : forbidden();
    }
    return handleError(e);
  }
}
