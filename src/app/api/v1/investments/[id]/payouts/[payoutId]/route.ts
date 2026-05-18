import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { requireRole, AuthError } from "@/server/auth/session";
import { payoutPaySchema, payoutUpdateSchema } from "@/lib/zod-schemas/investment";
import {
  ok,
  badRequest,
  handleError,
  notFound,
  unauthorized,
  forbidden,
} from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";
import dayjs from "@/lib/dayjs";

/** Mark a payout as paid (POST) — adds to paidAmount and bumps Investment.paidAmount. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; payoutId: string } }
) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = payoutPaySchema.parse(await req.json());

    const payout = await prisma.investmentPayout.findUnique({
      where: { id: params.payoutId },
    });
    if (!payout || payout.investmentId !== params.id)
      return notFound("Payout not found");

    const newPaid = Math.round((payout.paidAmount + body.paidAmount) * 100) / 100;
    if (newPaid > payout.totalDue + 0.01)
      return badRequest("Payment exceeds remaining due amount");

    const status =
      newPaid + 0.005 >= payout.totalDue ? "PAID" : newPaid > 0 ? "PARTIAL" : "PENDING";
    const paidAt = body.paidAt ? dayjs.utc(body.paidAt).toDate() : new Date();

    const [updated] = await prisma.$transaction([
      prisma.investmentPayout.update({
        where: { id: payout.id },
        data: {
          paidAmount: newPaid,
          status,
          paidAt,
          paymentMode: body.paymentMode,
          reference: body.reference ?? payout.reference,
          note: body.note ?? payout.note,
        },
      }),
      prisma.investment.update({
        where: { id: params.id },
        data: { paidAmount: { increment: body.paidAmount } },
      }),
    ]);

    await writeAudit({
      userId: user.id,
      action: "INVESTMENT_PAYOUT_PAID",
      entityType: "InvestmentPayout",
      entityId: updated.id,
      before: payout,
      after: updated,
      ...getRequestMeta(req),
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

/** Update the status of a payout (skip / re-open / set note) without recording money. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; payoutId: string } }
) {
  try {
    const user = await requireRole("SUPER_ADMIN", "ADMIN");
    const body = payoutUpdateSchema.parse(await req.json());

    const payout = await prisma.investmentPayout.findUnique({
      where: { id: params.payoutId },
    });
    if (!payout || payout.investmentId !== params.id)
      return notFound("Payout not found");

    const updated = await prisma.investmentPayout.update({
      where: { id: payout.id },
      data: { status: body.status, note: body.note ?? payout.note },
    });

    await writeAudit({
      userId: user.id,
      action: "INVESTMENT_PAYOUT_UPDATED",
      entityType: "InvestmentPayout",
      entityId: updated.id,
      before: payout,
      after: updated,
      ...getRequestMeta(req),
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
