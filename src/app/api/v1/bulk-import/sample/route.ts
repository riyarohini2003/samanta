import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { forbidden, unauthorized, handleError } from "@/lib/api";
import { generateSampleBuffer } from "@/server/services/bulk-import-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

export async function GET() {
  try {
    const me = await requireUser();
    if (!ADMIN_ROLES.has(me.role)) return forbidden("Only admins can download the sample sheet");
    const buf = await generateSampleBuffer();
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bulk-import-sample.xlsx"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return e.status === 401 ? unauthorized() : forbidden();
    return handleError(e);
  }
}
