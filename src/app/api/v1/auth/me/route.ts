import { getCurrentUser } from "@/server/auth/session";
import { ok, unauthorized } from "@/lib/api";

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return unauthorized();
  return ok(u);
}
