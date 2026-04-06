import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { photoUrl } = body;

    if (typeof photoUrl !== "string" && photoUrl !== null) {
      return badRequest("photoUrl must be a string URL or null");
    }

    // Basic URL validation when setting (not removing)
    if (photoUrl && !photoUrl.startsWith("https://")) {
      return badRequest("photoUrl must be a secure HTTPS URL");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: photoUrl || null },
      select: { id: true, photoUrl: true },
    });

    return ok(updated);
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    return serverError(e);
  }
}
