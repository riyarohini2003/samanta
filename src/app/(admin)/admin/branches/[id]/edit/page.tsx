import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/page-header";
import BranchForm from "../../new/branch-form";

export const dynamic = "force-dynamic";

export default async function EditBranchPage({ params }: { params: { id: string } }) {
  const branch = await prisma.branch.findFirst({
    where: { id: params.id, deletedAt: { isSet: false } },
  });
  if (!branch) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${branch.name}`} description={`Editing ${branch.code}`} />
      <BranchForm
        initial={{
          id: branch.id,
          name: branch.name,
          address: branch.address,
          city: branch.city,
          state: branch.state,
          pincode: branch.pincode,
          contactNumber: branch.contactNumber,
        }}
      />
    </div>
  );
}
