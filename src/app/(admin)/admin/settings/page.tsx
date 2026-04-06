import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/auth/session";
import { getAllSettings, maskIntegrations } from "@/server/settings";
import { formatRole } from "@/lib/constants";
import {
  OrganizationCard,
  LoanPolicyCard,
  SecurityCard,
  IntegrationsCard,
  AuditPolicyCard,
} from "./_components/settings-forms";
import {
  Building2,
  Landmark,
  ShieldCheck,
  Plug,
  FileClock,
} from "lucide-react";

export const dynamic = "force-dynamic";

const sections = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "loan-policy", label: "Loan policy", icon: Landmark },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "audit", label: "Audit & retention", icon: FileClock },
];

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const canEdit = me.role === "SUPER_ADMIN" || me.role === "ADMIN";
  if (!canEdit) {
    return (
      <div>
        <PageHeader title="Settings" description="System settings and preferences" />
        <Card>
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
            <CardDescription>
              Only administrators can view or change system settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const settings = await getAllSettings();
  const maskedIntegrations = maskIntegrations(settings.integrations);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Organization profile, loan policy, security, and integrations."
        actions={
          <Badge className="border-border/70 bg-muted/40 text-muted-foreground">
            Signed in as {formatRole(me.role)}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sticky section nav */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          <section id="organization" className="scroll-mt-20">
            <OrganizationCard value={settings.organization} />
          </section>

          <section id="loan-policy" className="scroll-mt-20">
            <LoanPolicyCard value={settings.loanPolicy} />
          </section>

          <section id="security" className="scroll-mt-20">
            <SecurityCard value={settings.security} />
          </section>

          <section id="integrations" className="scroll-mt-20">
            <IntegrationsCard
              value={maskedIntegrations}
              hasSmsKey={maskedIntegrations._masked.smsApiKey}
              hasWaKey={maskedIntegrations._masked.whatsappApiKey}
              hasSmtpPassword={maskedIntegrations._masked.smtpPassword}
            />
          </section>

          <section id="audit" className="scroll-mt-20">
            <AuditPolicyCard value={settings.auditPolicy} />
          </section>
        </div>
      </div>
    </div>
  );
}
