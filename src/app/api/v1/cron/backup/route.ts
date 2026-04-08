import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { uploadBuffer, deleteAsset } from "@/lib/cloudinary";

const RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ─── 1. Build backup JSON (same logic as manual backup) ──────────
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

    const stats = {
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
    };

    const backup = {
      _meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: { id: "system", name: "Auto Backup (Cron)", employeeCode: "SYSTEM" },
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
      _stats: stats,
    };

    // ─── 2. Upload to Cloudinary as raw JSON ─────────────────────────
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `samanta-backup-${timestamp}.json`;
    const jsonBuffer = Buffer.from(JSON.stringify(backup));

    const uploaded = await uploadBuffer(jsonBuffer, "backups", {
      resource_type: "raw",
      public_id: `samanta/backups/${filename}`,
      overwrite: true,
    });

    // ─── 3. Save metadata to DB ──────────────────────────────────────
    await prisma.backupSnapshot.create({
      data: {
        filename,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        sizeBytes: uploaded.bytes,
        stats,
        trigger: "cron",
      },
    });

    // ─── 4. Clean up old backups (> RETENTION_DAYS) ──────────────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const oldBackups = await prisma.backupSnapshot.findMany({
      where: { createdAt: { lt: cutoff } },
    });

    for (const old of oldBackups) {
      try {
        await deleteAsset(old.publicId);
      } catch {
        // Cloudinary deletion failure is non-critical
      }
    }

    if (oldBackups.length > 0) {
      await prisma.backupSnapshot.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
    }

    return NextResponse.json({
      ok: true,
      filename,
      sizeKB: Math.round(uploaded.bytes / 1024),
      stats,
      cleanedUp: oldBackups.length,
    });
  } catch (e: any) {
    console.error("[cron/backup] Failed:", e);
    return NextResponse.json(
      { error: "Backup failed", detail: e.message },
      { status: 500 },
    );
  }
}
