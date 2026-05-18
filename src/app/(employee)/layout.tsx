import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { LayoutShell } from "@/components/layout/layout-shell";
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
    <LayoutShell
      variant="employee"
      topbar={<Topbar user={user} title="Employee Panel" variant="employee" />}
    >
      {children}
    </LayoutShell>
  );
}
