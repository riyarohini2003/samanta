import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, UserSearch, ArrowRight } from "lucide-react";

export default function ApplyLoanPage() {
  return (
    <div>
      <PageHeader
        title="Apply Loan"
        description="Choose how you'd like to apply for a loan"
      />

      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
        <Link href="/admin/loan-applications/intake" className="group">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Apply New Customer Loan</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create a new customer profile and submit their first loan application together in one step.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                Get Started <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/loan-applications/existing" className="group">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                <UserSearch className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Existing Customer Loan Types</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Search for an existing customer, view their profile and loan history, then apply for an eligible loan type.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1 text-sm font-medium text-primary">
                Search Customer <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
