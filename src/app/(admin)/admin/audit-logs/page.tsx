import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/dayjs";

export const dynamic = "force-dynamic";

/** Extract a short human-friendly device/browser label from a raw User-Agent string. */
function summarizeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "—";
  const s = ua;
  let os = "Unknown";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(s)) os = "iOS";
  else if (/Linux/i.test(s)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s)) browser = "Safari";
  else if (/PostmanRuntime/i.test(s)) browser = "Postman";
  else if (/curl\//i.test(s)) browser = "curl";

  return `${browser} · ${os}`;
}

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, employeeCode: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Every sensitive action is recorded here — including the caller IP and device."
      />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{fmtDateTime(l.createdAt)}</TableCell>
                  <TableCell>{l.user?.name ?? "System"}</TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell>{l.entityType}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{l.entityId}</TableCell>
                  <TableCell className="font-mono text-xs">{l.ip ?? "—"}</TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground max-w-[220px] truncate"
                    title={l.userAgent ?? ""}
                  >
                    {summarizeUserAgent(l.userAgent)}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No audit logs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
