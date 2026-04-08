import type { CurrentUser } from "@/server/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebarTrigger } from "@/components/layout/sidebar";
import { formatRole } from "@/lib/constants";

export function Topbar({
  user,
  title,
  variant,
}: {
  user: CurrentUser;
  title?: string;
  variant: "admin" | "employee";
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebarTrigger variant={variant} />
        <h1 className="truncate text-lg font-semibold tracking-tight">
          {title ?? "Samanta LMS"}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />

        {/* Divider */}
        <div className="hidden h-7 w-px bg-border/60 sm:block" aria-hidden />

        {/* User chip */}
        <div className="flex items-center gap-2.5 rounded-full border border-border/50 bg-card/60 py-1 pl-1 pr-3 shadow-sm backdrop-blur transition-colors hover:bg-card/80">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 text-sm font-bold text-primary-foreground shadow-inner ring-2 ring-background">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden min-w-0 text-left sm:block">
            <div className="truncate text-sm font-semibold leading-tight">
              {user.name}
            </div>
            <div className="truncate text-[10px] font-medium text-muted-foreground">
              {user.employeeCode} · {formatRole(user.role)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
