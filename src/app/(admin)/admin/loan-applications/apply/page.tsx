import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { UserPlus, UserSearch, ArrowRight, FileEdit } from "lucide-react";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { scopeWhere } from "@/server/auth/guards";
import { fmtDate } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";

export default async function ApplyLoanPage() {
  let drafts: any[] = [];
  try {
    const me = await requireUser();
    drafts = await prisma.loanApplication.findMany({
      where: {
        status: "DRAFT",
        ...scopeWhere(me),
        ...(me.role === "EMPLOYEE" ? { createdById: me.id } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        customer: { select: { customerCode: true, fullName: true } },
        branch: { select: { code: true } },
      },
    });
  } catch {
    // Not authenticated or error — drafts stays empty
  }

  return (
    <div>
      <PageHeader
        title="Apply Loan"
        description="Choose how you'd like to apply for a loan"
      />

      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
        <Link href="/admin/loan-applications/intake" className="group">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Apply New Customer Loan</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a new customer profile and submit their first loan application together in one step.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                Get Started <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/loan-applications/existing" className="group">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <UserSearch className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Existing Customer Loan Types</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Search for an existing customer, view their profile and loan history, then apply for an eligible loan type.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                Search Customer <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ─── Drafts Section ──────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <Card className="mt-8 max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileEdit className="h-5 w-5" />
              Saved Drafts ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {drafts.map((d) => (
                <Link
                  key={d.id}
                  href={`/admin/loan-applications/${d.id}/edit`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{d.applicationNo}</span>
                      <StatusBadge status={d.status} />
                      <span className="text-xs text-muted-foreground">{d.loanType}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">
                      {d.customer.customerCode} · {d.customer.fullName} · {formatMoney(d.principal)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {fmtDate(d.updatedAt)}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
