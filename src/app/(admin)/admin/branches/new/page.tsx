import { PageHeader } from "@/components/ui/page-header";
import BranchForm from "./branch-form";

export default function NewBranchPage() {
  return (
    <div>
      <PageHeader title="New Branch" description="Create a new branch office" />
      <BranchForm />
    </div>
  );
}
