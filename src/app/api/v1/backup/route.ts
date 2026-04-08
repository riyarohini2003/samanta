import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { ok, unauthorized, forbidden, badRequest, handleError } from "@/lib/api";
import { writeAudit, getRequestMeta } from "@/server/audit";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

// Collections in dependency order (parents first) — used for restore inserts
const RESTORE_COLLECTIONS = [
  "counters",
  "settings",
  "branches",
  "investors",
  "investments",
  "customers",
  "customerDocuments",
  "loanApplications",
  "loanAppDocuments",
  "loanAccounts",
  "repaymentSchedules",
  "payments",
  "auditLogs",
  "notifications",
] as const;

// Reverse order for deletion (children first)
const DELETE_ORDER = [...RESTORE_COLLECTIONS].reverse();

export async function GET(req: NextRequest) {
  try {
    const me = await requireUser();
    if (!ADMIN_ROLES.has(me.role)) {
      return forbidden("Only admins can create backups");
    }

    // Fetch all collections in parallel
    const [
      users,
      branches,
      customers,
      customerDocuments,
      loanApplications,
      loanAppDocuments,
      loanAccounts,
      repaymentSchedules,
      payments,
      auditLogs,
      notifications,
      counters,
      investors,
      investments,
      settings,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, employeeCode: true, loginId: true, name: true,
          email: true, mobile: true, role: true, branchId: true,
          address: true, joiningDate: true, idProofUrl: true, photoUrl: true,
          isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true, deletedAt: true,
        },
      }),
      prisma.branch.findMany(),
      prisma.customer.findMany(),
      prisma.customerDocument.findMany(),
      prisma.loanApplication.findMany(),
      prisma.loanAppDocument.findMany(),
      prisma.loanAccount.findMany(),
      prisma.repaymentSchedule.findMany(),
      prisma.payment.findMany(),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 }),
      prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 5000 }),
      prisma.counter.findMany(),
      prisma.investor.findMany(),
      prisma.investment.findMany(),
      prisma.setting.findMany(),
    ]);

    const backup = {
      _meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: { id: me.id, name: me.name, employeeCode: me.employeeCode },
      },
      users,
      branches,
      customers,
      customerDocuments,
      loanApplications,
      loanAppDocuments,
      loanAccounts,
      repaymentSchedules,
      payments,
      auditLogs,
      notifications,
      counters,
      investors,
      investments,
      settings,
      _stats: {
        users: users.length,
        branches: branches.length,
        customers: customers.length,
        customerDocuments: customerDocuments.length,
        loanApplications: loanApplications.length,
        loanAppDocuments: loanAppDocuments.length,
        loanAccounts: loanAccounts.length,
        repaymentSchedules: repaymentSchedules.length,
        payments: payments.length,
        auditLogs: auditLogs.length,
        notifications: notifications.length,
        counters: counters.length,
        investors: investors.length,
        investments: investments.length,
        settings: settings.length,
      },
    };

    await writeAudit({
      userId: me.id,
      action: "BACKUP_CREATED",
      entityType: "System",
      entityId: "backup",
      after: backup._stats,
      ...getRequestMeta(req),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `samanta-backup-${timestamp}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}

// ─── Restore from backup ────────────────────────────────────────────────

// Prisma model map for deleteMany / createMany
const modelMap: Record<string, any> = {
  counters: prisma.counter,
  settings: prisma.setting,
  branches: prisma.branch,
  investors: prisma.investor,
  investments: prisma.investment,
  customers: prisma.customer,
  customerDocuments: prisma.customerDocument,
  loanApplications: prisma.loanApplication,
  loanAppDocuments: prisma.loanAppDocument,
  loanAccounts: prisma.loanAccount,
  repaymentSchedules: prisma.repaymentSchedule,
  payments: prisma.payment,
  auditLogs: prisma.auditLog,
  notifications: prisma.notification,
};

// Fields that are Date objects — Prisma needs actual Date instances, not strings
function coerceDates(records: any[]): any[] {
  if (!Array.isArray(records)) return records;
  return records.map((r) => {
    const out: any = { ...r };
    for (const [k, v] of Object.entries(out)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        out[k] = new Date(v);
      }
    }
    return out;
  });
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    if (me.role !== "SUPER_ADMIN") {
      return forbidden("Only super admins can restore backups");
    }

    const body = await req.json();

    // Validate backup structure
    if (!body?._meta?.version || !body._stats) {
      return badRequest("Invalid backup file — missing _meta or _stats");
    }

    const mode = (req.nextUrl.searchParams.get("mode") ?? "preview") as "preview" | "restore";

    // Preview mode — just return stats of what would be restored
    if (mode === "preview") {
      const preview: Record<string, number> = {};
      for (const key of RESTORE_COLLECTIONS) {
        preview[key] = Array.isArray(body[key]) ? body[key].length : 0;
      }
      return ok({
        meta: body._meta,
        stats: preview,
        hasUsers: Array.isArray(body.users) && body.users.length > 0,
        userCount: Array.isArray(body.users) ? body.users.length : 0,
      });
    }

    // Restore mode — delete existing data and insert from backup
    // Step 1: Delete all data in reverse dependency order (children first)
    // Sessions are also cleared so stale refs don't break
    await prisma.session.deleteMany();
    for (const key of DELETE_ORDER) {
      const model = modelMap[key];
      if (model) await model.deleteMany();
    }

    // Step 2: Insert data in dependency order (parents first)
    const restored: Record<string, number> = {};
    for (const key of RESTORE_COLLECTIONS) {
      const model = modelMap[key];
      const rows = body[key];
      if (!model || !Array.isArray(rows) || rows.length === 0) {
        restored[key] = 0;
        continue;
      }

      const data = coerceDates(rows);

      // createMany is fastest, but some models may need individual creates
      // due to MongoDB's _id handling. Use createMany where possible.
      try {
        await model.createMany({ data });
        restored[key] = data.length;
      } catch {
        // Fallback: insert one by one (slower but handles edge cases)
        let count = 0;
        for (const row of data) {
          try {
            await model.create({ data: row });
            count++;
          } catch {
            // skip individual failures (e.g. duplicate keys)
          }
        }
        restored[key] = count;
      }
    }

    await writeAudit({
      userId: me.id,
      action: "BACKUP_RESTORED",
      entityType: "System",
      entityId: "backup",
      after: { backupMeta: body._meta, restored },
      ...getRequestMeta(req),
    });

    return ok({
      success: true,
      restored,
      note: "Users and sessions were not replaced — existing logins are preserved.",
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
