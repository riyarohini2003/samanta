import { PageHeader } from "@/components/ui/page-header";
import { LoanCalculatorTool } from "@/features/calculator/loan-calculator-tool";

export default function EmployeeCalculatorPage() {
  return (
    <div>
      <PageHeader
        title="Loan Calculator"
        description="Estimate EMI, total payable, and repayment schedule before applying."
      />
      <LoanCalculatorTool />
    </div>
  );
}
