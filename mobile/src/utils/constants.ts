export const APP_NAME = 'Samanta LMS';

// Change this to your actual server URL
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000' // Android emulator → host machine
  : 'https://your-production-url.com';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;
export const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] as const;

export const LOAN_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export const PAYMENT_MODES = ['CASH', 'UPI', 'BANK', 'CHEQUE'] as const;

export const LOAN_APP_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SENT_BACK: 'Sent Back',
  DISBURSED: 'Disbursed',
  CLOSED: 'Closed',
};

export const LOAN_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  OVERDUE: 'Overdue',
  NPA: 'NPA',
  WRITTEN_OFF: 'Written Off',
};

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  MISSED: 'Missed',
  SKIPPED: 'Skipped',
};

export const DEFAULT_PAGE_SIZE = 20;

export const REPORT_TYPES = [
  { key: 'dailyCollectionSheet', label: 'Daily Collection Sheet', icon: 'receipt' },
  { key: 'outstandingReport', label: 'Outstanding Report', icon: 'trending-up' },
  { key: 'closedLoansReport', label: 'Closed Loans', icon: 'check-circle' },
  { key: 'customerReport', label: 'Customer Report', icon: 'people' },
  { key: 'repaymentScheduleReport', label: 'Repayment Schedule', icon: 'calendar' },
  { key: 'employeePerformance', label: 'Employee Performance', icon: 'bar-chart' },
  { key: 'npaReport', label: 'NPA Report', icon: 'warning' },
  { key: 'loanAgingReport', label: 'Loan Aging', icon: 'hourglass-empty' },
  { key: 'collectionEfficiency', label: 'Collection Efficiency', icon: 'speed' },
  { key: 'interestIncomeReport', label: 'Interest Income', icon: 'attach-money' },
  { key: 'penaltyReport', label: 'Penalty Report', icon: 'gavel' },
  { key: 'monthlySummary', label: 'Monthly Summary', icon: 'summarize' },
] as const;
