import { PageHeader } from "@/components/ui/page-header";
import { LoanCalculatorTool } from "@/features/calculator/loan-calculator-tool";

export default function AdminCalculatorPage() {
  return (
    <div>
      <PageHeader
        title="Loan Calculator"
        description="Quickly model loan terms, preview the EMI breakdown, and project the repayment schedule."
      />
      <LoanCalculatorTool />
    </div>
  );
}
