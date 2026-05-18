import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LayoutShell } from "@/components/layout/layout-shell";
import { Topbar } from "@/components/layout/topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    // DB unreachable or token corrupt — clear cookies via logout endpoint to avoid redirect loop
    redirect("/api/v1/auth/logout");
  }
  // Redirect through logout endpoint (clears stale cookies) to prevent
  // middleware ↔ layout redirect loop when JWT is valid but DB user is gone.
  if (!user) redirect("/api/v1/auth/logout");
  if (user.role === "EMPLOYEE") redirect("/employee/dashboard");

  return (
    <LayoutShell
      variant="admin"
      role={user.role}
      topbar={<Topbar user={user} title="Admin Panel" variant="admin" />}
    >
      {children}
    </LayoutShell>
  );
}
