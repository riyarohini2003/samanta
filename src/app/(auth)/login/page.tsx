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
    <div className="relative flex min-h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Dotted grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60"
        aria-hidden
      />

      {/* Animated gradient orbs */}
      <div
        className="orb -top-32 left-1/4 h-[400px] w-[400px] bg-primary/20 animate-float dark:bg-primary/10"
        aria-hidden
      />
      <div
        className="orb -bottom-24 right-1/4 h-[350px] w-[350px] bg-sky-400/15 animate-float-slow dark:bg-sky-400/10"
        style={{ animationDelay: "2s" }}
        aria-hidden
      />
      <div
        className="orb top-1/3 -right-20 h-[250px] w-[250px] bg-violet-400/10 animate-float dark:bg-violet-400/8"
        style={{ animationDelay: "4s" }}
        aria-hidden
      />

      {/* Theme toggle in corner */}
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-10 md:grid-cols-2 md:gap-16 lg:gap-20">
          {/* Left: brand + highlights (desktop only) */}
          <div className="hidden flex-col justify-center md:flex">
            <Link href="/" className="mb-10 inline-flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-sky-400/20 blur-sm transition-all group-hover:from-primary/30 group-hover:to-sky-400/30" />
                <Image src="/logo.png" alt="Samanta Finance" width={48} height={48} className="relative rounded-2xl" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">Samanta LMS</div>
                <div className="text-xs text-muted-foreground">Loan Management System</div>
              </div>
            </Link>

            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl xl:text-[2.75rem] xl:leading-tight">
              Manage lending,{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-sky-400 bg-clip-text text-transparent">
                end to end
              </span>
              .
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Applications, disbursements, collections, and reports — one workspace for
              your branches, field officers, and finance team.
            </p>

            <ul className="mt-12 space-y-6">
              {highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <li
                    key={h.title}
                    className="flex gap-4 animate-fade-in"
                    style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 dark:bg-primary/15 dark:ring-primary/20 transition-all hover:scale-105 hover:bg-primary/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{h.title}</div>
                      <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{h.desc}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right: login form */}
          <div className="flex flex-col justify-center animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
            {/* Mobile brand */}
            <div className="mb-8 text-center md:hidden">
              <div className="relative mx-auto mb-4 h-14 w-14">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-sky-400/20 blur-sm" />
                <Image src="/logo.png" alt="Samanta Finance" width={56} height={56} className="relative rounded-2xl" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Samanta LMS</h1>
              <p className="mt-1 text-sm text-muted-foreground">Loan Management System</p>
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
