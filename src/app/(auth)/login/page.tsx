import Image from "next/image";
import Link from "next/link";
import LoginForm from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldCheck, TrendingUp, Wallet } from "lucide-react";

export const metadata = { title: "Login · Samanta LMS" };

const highlights = [
  {
    icon: TrendingUp,
    title: "Real-time insights",
    desc: "Branch, loan, and collection metrics at a glance.",
  },
  {
    icon: Wallet,
    title: "Daily collections",
    desc: "Track dues, payments, and overdue accounts on the go.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade security",
    desc: "Role-based access, full audit trail, encrypted sessions.",
  },
];

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Dotted grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-70"
        aria-hidden
      />
      {/* Brand glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/15"
        aria-hidden
      />

      {/* Theme toggle in corner */}
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-10 md:grid-cols-2 md:gap-16">
          {/* Left: brand + highlights (desktop only) */}
          <div className="hidden flex-col justify-center md:flex">
            <Link href="/" className="mb-8 inline-flex items-center gap-3">
              <Image src="/logo.png" alt="Samanta Finance" width={48} height={48} className="rounded-2xl" />
              <div>
                <div className="text-lg font-bold leading-tight">Samanta LMS</div>
                <div className="text-xs text-muted-foreground">Loan Management System</div>
              </div>
            </Link>

            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Manage lending,{" "}
              <span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">
                end to end
              </span>
              .
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Applications, disbursements, collections, and reports — one workspace for
              your branches, field officers, and finance team.
            </p>

            <ul className="mt-10 space-y-5">
              {highlights.map((h) => {
                const Icon = h.icon;
                return (
                  <li key={h.title} className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 dark:bg-primary/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{h.title}</div>
                      <div className="text-xs text-muted-foreground">{h.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right: login form */}
          <div className="flex flex-col justify-center">
            {/* Mobile brand */}
            <div className="mb-8 text-center md:hidden">
              <Image src="/logo.png" alt="Samanta Finance" width={56} height={56} className="mx-auto mb-3 rounded-2xl" />
              <h1 className="text-2xl font-bold tracking-tight">Samanta LMS</h1>
              <p className="text-sm text-muted-foreground">Loan Management System</p>
            </div>
            <LoginForm />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Protected by role-based access. Contact your administrator if you need help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
