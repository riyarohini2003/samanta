import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/api/v1/auth/logout");
  }
  if (!user) redirect("/api/v1/auth/logout");

  return (
    <div className="min-h-screen bg-background md:pl-64">
      <Sidebar variant="employee" />
      <div className="flex min-h-screen flex-col">
        <Topbar user={user} title="Employee Panel" variant="employee" />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
