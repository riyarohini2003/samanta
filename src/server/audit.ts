import { prisma } from "./db";

export type RequestMeta = { ip: string | null; userAgent: string | null };

/**
 * Extract caller IP + user agent from a Request (or NextRequest, or next/headers headers()).
 * Honors the common proxy headers so deployments behind Vercel / Cloudflare / nginx still
 * get the real client IP instead of the load balancer.
 */
export function getRequestMeta(
  source: { headers: Headers | { get(name: string): string | null } }
): RequestMeta {
  const h = source.headers as { get(name: string): string | null };
  const forwardedFor = h.get("x-forwarded-for");
  const ip =
    (forwardedFor ? forwardedFor.split(",")[0]?.trim() : null) ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    h.get("true-client-ip") ||
    null;
  return {
    ip: ip || null,
    userAgent: h.get("user-agent"),
  };
}

export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: (params.before as any) ?? undefined,
        after: (params.after as any) ?? undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (e) {
    // Never fail business ops because audit log write failed
    console.error("audit log failed:", e);
  }
}
