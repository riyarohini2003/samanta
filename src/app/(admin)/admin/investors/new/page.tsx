import { PageHeader } from "@/components/ui/page-header";
import InvestorForm from "./investor-form";

export default function NewInvestorPage() {
  return (
    <div>
      <PageHeader title="New Investor" description="Register a new investor" />
      <InvestorForm />
    </div>
  );
}
