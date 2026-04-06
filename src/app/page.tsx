import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

export default async function RootPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/api/v1/auth/logout");
  }
  if (!user) redirect("/login");
  if (user.role === "EMPLOYEE") redirect("/employee/dashboard");
  redirect("/admin/dashboard");
}
