import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { IglBadge } from "@/components/ui/igl-badge";
import { getApplicationSerial } from "@/server/services/igl-serial";
import { fmtDate, fmtDateTime } from "@/lib/dayjs";
import { formatMoney } from "@/lib/formatters";
import { ReviewActions } from "./review-actions";
import { LoanDetailsEditable } from "./loan-details-editable";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = new Set(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SENT_BACK"]);

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const app = await prisma.loanApplication.findUnique({
    where: { id: params.id },
    include: {
      customer: { include: { documents: true } },
      branch: true,
      createdBy: { select: { id: true, name: true, employeeCode: true } },
      reviewedBy: { select: { id: true, name: true } },
      loanAccount: true,
      documents: true,
    },
  });
  if (!app) notFound();

  const iglSerial = await getApplicationSerial(app.id);

  const employees = await prisma.user.findMany({
    where: { branchId: app.branchId, deletedAt: { isSet: false }, isActive: true, role: { in: ["EMPLOYEE", "BRANCH_MANAGER"] } },
    select: { id: true, name: true, employeeCode: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            {app.applicationNo}
            <IglBadge serial={iglSerial} />
          </span>
        }
        description={`${app.customer.fullName} · ${app.branch.name}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/admin/loan-applications/${app.id}/print`} target="_blank">Print / PDF</Link></Button>
            <Button asChild variant="outline"><Link href="/admin/loan-applications">Back</Link></Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={app.status} />
        <span className="text-sm text-muted-foreground">Created {fmtDateTime(app.createdAt)} by {app.createdBy.name}</span>
      </div>

      {app.loanAccount ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CardHeader><CardTitle>Disbursed as {app.loanAccount.accountNo}</CardTitle></CardHeader>
          <CardContent>
            <Button asChild><Link href={`/admin/loans/${app.loanAccount.id}`}>View Loan Account</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <ReviewActions appId={app.id} status={app.status} employees={employees} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LoanDetailsEditable
            canEdit={EDITABLE_STATUSES.has(app.status) && !app.loanAccount}
            app={{
              id: app.id,
              loanType: app.loanType as "DAILY" | "WEEKLY" | "MONTHLY",
              principal: app.principal,
              interestRate: app.interestRate,
              processingFee: app.processingFee,
              tenureCount: app.tenureCount,
              installmentAmount: app.installmentAmount,
              totalPayable: app.totalPayable,
              interestAmount: app.interestAmount,
              startDate: app.startDate,
              maturityDate: app.maturityDate,
              purpose: app.purpose,
              notes: app.notes,
            }}
          />
        </div>

        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {app.customer.photoUrl && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={app.customer.photoUrl}
                  alt={app.customer.fullName}
                  className="h-32 w-24 rounded-md border object-cover"
                />
              </div>
            )}
            <Row label="Name" value={app.customer.fullName} />
            <Row label="Code" value={app.customer.customerCode} />
            <Row label="Mobile" value={app.customer.mobile} />
            <Row label="Aadhaar" value={app.customer.aadhaar ?? "—"} />
            <Row label="Occupation" value={app.customer.occupation ?? "—"} />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/admin/customers/${app.customer.id}`}>View Full Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {(app.customer.documents.length > 0 || app.documents.length > 0) && (
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {app.customer.documents.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">KYC Documents</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {app.customer.documents.map((d) => <DocThumb key={d.id} type={d.type} url={d.url} />)}
                </div>
              </div>
            )}
            {app.documents.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Loan Documents</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {app.documents.map((d) => <DocThumb key={d.id} type={d.type} url={d.url} />)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {app.reviewRemark && (
        <Card>
          <CardHeader><CardTitle>Review</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{app.reviewRemark}</p>
            {app.reviewedBy && <p className="mt-2 text-xs text-muted-foreground">— {app.reviewedBy.name} at {fmtDateTime(app.reviewedAt)}</p>}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function Row({ label, value, strong, wide }: { label: string; value: React.ReactNode; strong?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={"mt-1 " + (strong ? "text-base font-bold" : "text-sm font-medium")}>{value}</div>
    </div>
  );
}

function DocThumb({ type, url }: { type: string; url: string }) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-md border transition hover:ring-2 hover:ring-primary"
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={type} className="h-28 w-full object-cover" />
      ) : (
        <div className="flex h-28 items-center justify-center bg-muted text-xs text-muted-foreground">
          PDF / File
        </div>
      )}
      <div className="border-t bg-muted/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {type.replace(/_/g, " ")}
      </div>
    </a>
  );
}
