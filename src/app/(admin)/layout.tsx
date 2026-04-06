import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
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
    <div className="min-h-screen bg-background md:pl-64">
      <Sidebar variant="admin" />
      <div className="flex min-h-screen flex-col">
        <Topbar user={user} title="Admin Panel" variant="admin" />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
