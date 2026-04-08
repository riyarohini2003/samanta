"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCircle,
  FileText,
  FilePlus2,
  Landmark,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
  DatabaseBackup,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Accent color class applied to the icon when active */
  color?: string;
};
type NavSection = { label: string; items: NavItem[] };

const adminNav: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/admin/branches", label: "Branches", icon: Building2, color: "text-violet-500" },
      { href: "/admin/employees", label: "Employees", icon: UserCircle, color: "text-indigo-500" },
      { href: "/admin/customers", label: "Customers", icon: Users, color: "text-cyan-500" },
    ],
  },
  {
    label: "Lending",
    items: [
      { href: "/admin/loan-applications/apply", label: "Apply Loan", icon: FilePlus2, color: "text-emerald-500" },
      { href: "/admin/loan-applications", label: "Applications", icon: FileText, color: "text-sky-500" },
      { href: "/admin/loans", label: "Loans", icon: Landmark, color: "text-amber-500" },
      { href: "/admin/collections", label: "Collections", icon: Wallet, color: "text-green-500" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, color: "text-pink-500" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, color: "text-orange-500" },
      { href: "/admin/backup", label: "Backup", icon: DatabaseBackup, color: "text-teal-500" },
      { href: "/admin/settings", label: "Settings", icon: Settings, color: "text-slate-500" },
    ],
  },
];

const employeeNav: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-500" },
    ],
  },
  {
    label: "Field Work",
    items: [
      { href: "/employee/customers", label: "Customers", icon: Users, color: "text-cyan-500" },
      { href: "/employee/loan-applications/apply", label: "Apply Loan", icon: FilePlus2, color: "text-emerald-500" },
      { href: "/employee/loan-applications", label: "Applications", icon: FileText, color: "text-sky-500" },
      { href: "/employee/loans", label: "Loans", icon: Landmark, color: "text-amber-500" },
      { href: "/employee/collections", label: "Collections", icon: Wallet, color: "text-green-500" },
    ],
  },
  {
    label: "Me",
    items: [
      { href: "/employee/performance", label: "Performance", icon: BarChart3, color: "text-pink-500" },
      { href: "/employee/settings", label: "Settings", icon: Settings, color: "text-slate-500" },
    ],
  },
];

async function logout() {
  await fetch("/api/v1/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

function SidebarBody({
  variant,
  onNavigate,
}: {
  variant: "admin" | "employee";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = variant === "admin" ? adminNav : employeeNav;

  return (
    <>
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/60 px-5">
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-br from-primary/20 to-sky-400/20 opacity-0 blur-sm transition-opacity group-hover:opacity-100" />
          <Image src="/logo.png" alt="Samanta Finance" width={34} height={34} className="relative rounded-lg" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight tracking-tight">Samanta LMS</div>
          <div className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
            {variant} Panel
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-3 overflow-hidden px-3 py-3">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isChild = pathname.startsWith(item.href + "/");
                const hasMoreSpecificSibling = isChild && section.items.some(
                  (other) => other !== item && other.href.length > item.href.length && pathname.startsWith(other.href)
                );
                const active = pathname === item.href || (isChild && !hasMoreSpecificSibling);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                      )}
                    >
                      {/* Active accent bar */}
                      <span
                        className={cn(
                          "absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary transition-all duration-200",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-20"
                        )}
                        aria-hidden
                      />
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                          active
                            ? (item.color ?? "text-primary")
                            : "text-muted-foreground/70 group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/60 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );
}

export function Sidebar({ variant }: { variant: "admin" | "employee" }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border/60 bg-sidebar text-sidebar-foreground md:flex">
      <SidebarBody variant={variant} />
    </aside>
  );
}

export function MobileSidebarTrigger({ variant }: { variant: "admin" | "employee" }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Auto-close the drawer whenever the route changes (e.g. after clicking a link).
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Main navigation menu
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
          <SidebarBody variant={variant} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
