import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/guards";
import { ok, handleError, notFound, unauthorized, forbidden } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

const isoDate = z.string().refine((v) => !isNaN(new Date(v).getTime()), "Invalid date");

const scheduleUpdateSchema = z
  .object({
    installmentNo: z.coerce.number().int().positive().optional(),
    dueDate: isoDate.optional(),
    dueAmount: z.coerce.number().nonnegative().optional(),
    paidAmount: z.coerce.number().nonnegative().optional(),
    paidAt: isoDate.nullable().optional(),
    status: z.enum(["PENDING", "PAID", "PARTIAL", "MISSED", "SKIPPED"]).optional(),
    penaltyAmount: z.coerce.number().nonnegative().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; scheduleId: string } },
) {
  try {
    const me = await requireUser();
    if (!isAdmin(me)) return forbidden("Only admins can edit installments");

    const body = scheduleUpdateSchema.parse(await req.json());

    const before = await prisma.repaymentSchedule.findFirst({
      where: { id: params.scheduleId, loanAccountId: params.id },
    });
    if (!before) return notFound("Installment not found");

    const data: Record<string, unknown> = {};
    if (body.installmentNo !== undefined) data.installmentNo = body.installmentNo;
    if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate);
    if (body.dueAmount !== undefined) data.dueAmount = body.dueAmount;
    if (body.paidAmount !== undefined) data.paidAmount = body.paidAmount;
    if (body.paidAt !== undefined) data.paidAt = body.paidAt ? new Date(body.paidAt) : null;
    if (body.status !== undefined) data.status = body.status;
    if (body.penaltyAmount !== undefined) data.penaltyAmount = body.penaltyAmount;

    const updated = await prisma.repaymentSchedule.update({
      where: { id: params.scheduleId },
      data,
    });

    const meta = getRequestMeta(req);
    await writeAudit({
      userId: me.id,
      action: "INSTALLMENT_ADMIN_UPDATE",
      entityType: "RepaymentSchedule",
      entityId: params.scheduleId,
      before,
      after: updated,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
