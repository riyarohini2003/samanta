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
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
type NavSection = { label: string; items: NavItem[] };

const adminNav: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Organization",
    items: [
      { href: "/admin/branches", label: "Branches", icon: Building2 },
      { href: "/admin/employees", label: "Employees", icon: UserCircle },
      { href: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Lending",
    items: [
      { href: "/admin/loan-applications/apply", label: "Apply Loan", icon: FilePlus2 },
      { href: "/admin/loan-applications", label: "Applications", icon: FileText },
      { href: "/admin/loans", label: "Loans", icon: Landmark },
      { href: "/admin/collections", label: "Collections", icon: Wallet },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const employeeNav: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Field Work",
    items: [
      { href: "/employee/customers", label: "Customers", icon: Users },
      { href: "/employee/loan-applications/apply", label: "Apply Loan", icon: FilePlus2 },
      { href: "/employee/loan-applications", label: "Applications", icon: FileText },
      { href: "/employee/loans", label: "Loans", icon: Landmark },
      { href: "/employee/collections", label: "Collections", icon: Wallet },
    ],
  },
  {
    label: "Me",
    items: [
      { href: "/employee/performance", label: "Performance", icon: BarChart3 },
      { href: "/employee/settings", label: "Settings", icon: Settings },
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
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <Image src="/logo.png" alt="Samanta Finance" width={36} height={36} className="rounded-lg" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight">Samanta LMS</div>
          <div className="truncate text-[11px] capitalize text-muted-foreground">
            {variant} Panel
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
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
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                      )}
                    >
                      {/* Active accent bar */}
                      <span
                        className={cn(
                          "absolute inset-y-1 left-0 w-1 rounded-r-full bg-primary transition-all",
                          active ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                        )}
                        aria-hidden
                      />
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
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
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
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
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Main navigation menu
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
