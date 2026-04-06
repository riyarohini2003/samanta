"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  saveOrganizationAction,
  saveLoanPolicyAction,
  saveSecurityAction,
  saveIntegrationsAction,
  saveAuditPolicyAction,
  type ActionState,
} from "../actions";
import type {
  OrganizationSettings,
  LoanPolicySettings,
  SecurityPolicy,
  IntegrationSettings,
  AuditPolicy,
} from "@/server/settings";

const initialState: ActionState = { ok: false, message: "" };

/* ─── shared bits ──────────────────────────────────────────────────────── */

function FormFeedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        state.ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
      )}
      role="status"
    >
      {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      <span>{state.message}</span>
    </div>
  );
}

function SubmitButton({ children = "Save changes" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  name,
  defaultChecked,
  label,
  description,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40">
      {/* Hidden field ensures an unchecked checkbox still submits "false" */}
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        )}
      </div>
    </label>
  );
}

/* ─── Organization ─────────────────────────────────────────────────────── */

export function OrganizationCard({ value }: { value: OrganizationSettings }) {
  const [state, action] = useFormState(saveOrganizationAction, initialState);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>
          Company details shown on receipts, reports, and emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <Input name="companyName" defaultValue={value.companyName} required />
            </Field>
            <Field label="Legal name">
              <Input name="legalName" defaultValue={value.legalName} />
            </Field>
            <Field label="Contact email">
              <Input type="email" name="contactEmail" defaultValue={value.contactEmail} />
            </Field>
            <Field label="Contact phone">
              <Input name="contactPhone" defaultValue={value.contactPhone} />
            </Field>
            <Field label="Currency">
              <select
                name="currency"
                defaultValue={value.currency}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Website">
              <Input name="website" defaultValue={value.website} placeholder="https://" />
            </Field>
            <Field label="GSTIN / Tax ID" className="sm:col-span-2">
              <Input name="gstin" defaultValue={value.gstin} />
            </Field>
            <Field label="Registered address" className="sm:col-span-2">
              <Textarea name="address" defaultValue={value.address} rows={3} />
            </Field>
          </div>
          <FormFeedback state={state} />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Loan Policy ──────────────────────────────────────────────────────── */

export function LoanPolicyCard({ value }: { value: LoanPolicySettings }) {
  const [state, action] = useFormState(saveLoanPolicyAction, initialState);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan policy defaults</CardTitle>
        <CardDescription>
          Applied as suggestions when creating new applications. Individual loans can override these.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Default interest rates (%)
            </Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Field label="Daily / day">
                <Input
                  type="number"
                  step="0.01"
                  name="rateDaily"
                  defaultValue={value.defaultInterestRates.DAILY}
                />
              </Field>
              <Field label="Weekly / week">
                <Input
                  type="number"
                  step="0.01"
                  name="rateWeekly"
                  defaultValue={value.defaultInterestRates.WEEKLY}
                />
              </Field>
              <Field label="Monthly / month">
                <Input
                  type="number"
                  step="0.01"
                  name="rateMonthly"
                  defaultValue={value.defaultInterestRates.MONTHLY}
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Processing fee %" hint="Charged upfront on disbursement">
              <Input
                type="number"
                step="0.01"
                name="defaultProcessingFeePct"
                defaultValue={value.defaultProcessingFeePct}
              />
            </Field>
            <Field label="Late penalty / day" hint="Flat fee per overdue day">
              <Input
                type="number"
                step="0.01"
                name="defaultPenaltyPerDay"
                defaultValue={value.defaultPenaltyPerDay}
              />
            </Field>
            <Field label="Grace days" hint="Days before an installment counts as overdue">
              <Input type="number" name="graceDays" defaultValue={value.graceDays} />
            </Field>
            <div />
            <Field label="Minimum principal">
              <Input type="number" name="minPrincipal" defaultValue={value.minPrincipal} />
            </Field>
            <Field label="Maximum principal">
              <Input type="number" name="maxPrincipal" defaultValue={value.maxPrincipal} />
            </Field>
          </div>

          <Toggle
            name="autoCloseOnFullPayment"
            defaultChecked={value.autoCloseOnFullPayment}
            label="Auto-close loans on full payment"
            description="When the pending amount reaches zero, mark the loan CLOSED automatically."
          />

          <FormFeedback state={state} />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Security ─────────────────────────────────────────────────────────── */

export function SecurityCard({ value }: { value: SecurityPolicy }) {
  const [state, action] = useFormState(saveSecurityAction, initialState);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security policy</CardTitle>
        <CardDescription>Password rules, session behaviour, and admin controls.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum password length">
              <Input
                type="number"
                name="passwordMinLength"
                defaultValue={value.passwordMinLength}
                min={6}
                max={64}
              />
            </Field>
            <Field
              label="Force password change every (days)"
              hint="Set to 0 to disable forced rotation"
            >
              <Input
                type="number"
                name="forcePasswordChangeDays"
                defaultValue={value.forcePasswordChangeDays}
              />
            </Field>
            <Field
              label="Max failed login attempts"
              hint="Account is temporarily locked after this many failures"
            >
              <Input
                type="number"
                name="maxFailedLoginAttempts"
                defaultValue={value.maxFailedLoginAttempts}
              />
            </Field>
            <Field label="Session idle timeout (minutes)">
              <Input
                type="number"
                name="sessionIdleTimeoutMinutes"
                defaultValue={value.sessionIdleTimeoutMinutes}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              name="requireUppercase"
              defaultChecked={value.requireUppercase}
              label="Require uppercase letter"
            />
            <Toggle
              name="requireNumber"
              defaultChecked={value.requireNumber}
              label="Require digit"
            />
            <Toggle
              name="requireSymbol"
              defaultChecked={value.requireSymbol}
              label="Require symbol"
            />
            <Toggle
              name="require2FAForAdmins"
              defaultChecked={value.require2FAForAdmins}
              label="Require 2FA for admins"
              description="Forces CEO / Admin users to enroll a second factor."
            />
          </div>

          <FormFeedback state={state} />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Integrations ─────────────────────────────────────────────────────── */

export function IntegrationsCard({
  value,
  hasSmsKey,
  hasWaKey,
  hasSmtpPassword,
}: {
  value: IntegrationSettings;
  hasSmsKey: boolean;
  hasWaKey: boolean;
  hasSmtpPassword: boolean;
}) {
  const [state, action] = useFormState(saveIntegrationsAction, initialState);
  const secretPlaceholder = "•••••••• (leave blank to keep existing)";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>
          Connect SMS, WhatsApp, and email providers. Credentials are never shown after saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          {/* SMS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">SMS gateway</h4>
              <Toggle name="smsEnabled" defaultChecked={value.sms.enabled} label="Enabled" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Provider">
                <Input
                  name="smsProvider"
                  defaultValue={value.sms.provider}
                  placeholder="e.g. MSG91, Twilio"
                />
              </Field>
              <Field label="Sender ID">
                <Input name="smsSenderId" defaultValue={value.sms.senderId} />
              </Field>
              <Field label="API key">
                <Input
                  type="password"
                  name="smsApiKey"
                  placeholder={hasSmsKey ? secretPlaceholder : "Paste API key"}
                  autoComplete="off"
                />
              </Field>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">WhatsApp</h4>
              <Toggle name="waEnabled" defaultChecked={value.whatsapp.enabled} label="Enabled" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Provider">
                <Input
                  name="waProvider"
                  defaultValue={value.whatsapp.provider}
                  placeholder="e.g. Meta Cloud API"
                />
              </Field>
              <Field label="Phone number ID">
                <Input name="waPhoneNumberId" defaultValue={value.whatsapp.phoneNumberId} />
              </Field>
              <Field label="API key">
                <Input
                  type="password"
                  name="waApiKey"
                  placeholder={hasWaKey ? secretPlaceholder : "Paste API key"}
                  autoComplete="off"
                />
              </Field>
            </div>
          </section>

          {/* SMTP */}
          <section className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Email (SMTP)</h4>
              <Toggle name="smtpEnabled" defaultChecked={value.smtp.enabled} label="Enabled" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Host">
                <Input name="smtpHost" defaultValue={value.smtp.host} placeholder="smtp.example.com" />
              </Field>
              <Field label="Port">
                <Input type="number" name="smtpPort" defaultValue={value.smtp.port} />
              </Field>
              <Field label="Username">
                <Input name="smtpUser" defaultValue={value.smtp.user} />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  name="smtpPassword"
                  placeholder={hasSmtpPassword ? secretPlaceholder : "Password"}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="From address" className="sm:col-span-2">
                <Input
                  type="email"
                  name="smtpFromAddress"
                  defaultValue={value.smtp.fromAddress}
                  placeholder="no-reply@company.com"
                />
              </Field>
            </div>
          </section>

          <FormFeedback state={state} />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Audit policy ─────────────────────────────────────────────────────── */

export function AuditPolicyCard({ value }: { value: AuditPolicy }) {
  const [state, action] = useFormState(saveAuditPolicyAction, initialState);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit &amp; retention</CardTitle>
        <CardDescription>
          How long to keep audit logs and which actions to record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Field label="Retention period (days)" hint="Audit entries older than this may be archived.">
            <Input type="number" name="retentionDays" defaultValue={value.retentionDays} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              name="logReadActions"
              defaultChecked={value.logReadActions}
              label="Log read actions"
              description="Also record viewing of sensitive entities (increases log volume)."
            />
            <Toggle
              name="alertOnDestructiveAction"
              defaultChecked={value.alertOnDestructiveAction}
              label="Alert on destructive actions"
              description="Notify admins when a record is deleted or a loan is written off."
            />
          </div>
          <FormFeedback state={state} />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
