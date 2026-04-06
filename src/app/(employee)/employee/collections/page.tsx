import { PageHeader } from "@/components/ui/page-header";
import { CollectionCenter } from "@/features/collections/collection-center";

export const dynamic = "force-dynamic";

export default function EmployeeCollectionsPage() {
  return (
    <div>
      <PageHeader
        title="My Collections"
        description="Today's due customers · daily, weekly & monthly in one place"
      />
      <CollectionCenter scope="employee" branches={[]} employees={[]} />
    </div>
  );
}
