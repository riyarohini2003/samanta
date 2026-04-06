import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordCard } from "@/features/settings/change-password-card";
import { ProfilePhotoCard } from "@/features/settings/profile-photo-card";

export const dynamic = "force-dynamic";

export default async function EmployeeSettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account preferences" />
      <div className="max-w-2xl space-y-6">
        <ProfilePhotoCard initialUrl={me.photoUrl} />
        <ChangePasswordCard />
      </div>
    </div>
  );
}
