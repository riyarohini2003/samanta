import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireUser, AuthError } from "@/server/auth/session";
import { unauthorized, forbidden, handleError } from "@/lib/api";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

/** Redirect to the Cloudinary download URL for a specific backup */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const me = await requireUser();
    if (!ADMIN_ROLES.has(me.role)) {
      return forbidden("Only admins can download backups");
    }

    const snapshot = await prisma.backupSnapshot.findUnique({
      where: { id: params.id },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    // Redirect to the Cloudinary URL for download
    return NextResponse.redirect(snapshot.url);
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
