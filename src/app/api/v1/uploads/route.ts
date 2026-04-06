import { NextRequest } from "next/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { uploadBuffer } from "@/lib/cloudinary";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const ALLOWED_FOLDERS = new Set([
  "customers",
  "customer-docs",
  "loan-docs",
  "signatures",
  "profile-photos",
]);

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    const folderRaw = String(form.get("folder") || "customers");
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "customers";

    if (!file || !(file instanceof Blob)) {
      return badRequest("No file uploaded");
    }
    if (file.size === 0) return badRequest("Empty file");
    if (file.size > MAX_BYTES) return badRequest("File too large (max 8 MB)");

    const type = (file as any).type || "";
    if (!ALLOWED_MIME.has(type)) {
      return badRequest(`Unsupported file type: ${type || "unknown"}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadBuffer(buffer, folder);

    return ok({
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes,
      format: result.format,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    return serverError(e);
  }
}
