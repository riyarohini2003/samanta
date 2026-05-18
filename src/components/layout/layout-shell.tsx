"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarStateProvider, useSidebarState } from "@/components/layout/sidebar-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

function ShellInner({
  variant,
  role,
  topbar,
  children,
}: {
  variant: "admin" | "employee";
  role?: Role;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebarState();
  return (
    <div
      className={cn(
        "min-h-screen bg-background transition-[padding] duration-200 ease-out",
        collapsed ? "md:pl-16" : "md:pl-64"
      )}
    >
      <Sidebar variant={variant} role={role} />
      <div className="flex min-h-screen flex-col">
        {topbar}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function LayoutShell({
  variant,
  role,
  topbar,
  children,
}: {
  variant: "admin" | "employee";
  role?: Role;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarStateProvider>
      <ShellInner variant={variant} role={role} topbar={topbar}>
        {children}
      </ShellInner>
    </SidebarStateProvider>
  );
}

export function DesktopSidebarToggle() {
  const { collapsed, toggle } = useSidebarState();
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      title={collapsed ? "Show sidebar" : "Hide sidebar"}
      className="hidden md:inline-flex"
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
