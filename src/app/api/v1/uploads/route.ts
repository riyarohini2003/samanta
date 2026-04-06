import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { requireUser, AuthError } from "@/server/auth/session";
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
]);

function extFromMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

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
    const ext = extFromMime(type);
    const name = `${Date.now()}-${randomUUID()}.${ext}`;

    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buffer);

    const url = `/uploads/${folder}/${name}`;
    return ok({ url, name, size: file.size, mime: type });
  } catch (e) {
    if (e instanceof AuthError) return unauthorized();
    return serverError(e);
  }
}
