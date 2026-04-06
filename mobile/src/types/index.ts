/* ─── Enums ─── */
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_MANAGER' | 'EMPLOYEE';
export type LoanType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type LoanAppStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SENT_BACK' | 'DISBURSED' | 'CLOSED';
export type LoanStatus = 'ACTIVE' | 'CLOSED' | 'OVERDUE' | 'NPA' | 'WRITTEN_OFF';
export type InstallmentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'MISSED' | 'SKIPPED';
export type PaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
export type DisbursementMode = 'CASH' | 'BANK' | 'UPI' | 'CHEQUE';

/* ─── User / Auth ─── */
export interface User {
  id: string;
  name: string;
  loginId: string;
  email?: string;
  mobile?: string;
  role: Role;
  branchId?: string | null;
  branch?: Branch | null;
  employeeCode?: string;
  isActive?: boolean;
  joiningDate?: string;
  address?: string;
  createdAt?: string;
}

export interface LoginResponse {
  user: User;
  redirect: string;
}

/* ─── Branch ─── */
export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  managerId?: string | null;
  manager?: User | null;
  isActive: boolean;
  createdAt: string;
  _count?: { users?: number; customers?: number; loanAccounts?: number };
}

/* ─── Customer ─── */
export interface Customer {
  id: string;
  customerCode: string;
  fullName: string;
  fatherOrHusband?: string;
  mobile: string;
  altMobile?: string;
  aadhaar?: string;
  panOrTaxId?: string;
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  occupation?: string;
  monthlyIncome?: number;
  currentAddress: string;
  permanentAddress?: string;
  guarantorName?: string;
  guarantorMobile?: string;
  guarantorRelation?: string;
  referenceName?: string;
  referenceMobile?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  branchId: string;
  branch?: Branch;
  photoUrl?: string;
  createdById?: string;
  createdBy?: User;
  createdAt: string;
  documents?: CustomerDocument[];
  _count?: { loanApplications?: number; loanAccounts?: number };
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  type: string;
  url: string;
  uploadedAt: string;
}

/* ─── Loan Application ─── */
export interface LoanApplication {
  id: string;
  applicationNo: string;
  customerId: string;
  customer?: Customer;
  branchId: string;
  branch?: Branch;
  loanType: LoanType;
  principal: number;
  interestRate: number;
  processingFee: number;
  tenureCount: number;
  installmentAmount: number;
  totalPayable: number;
  interestAmount: number;
  startDate: string;
  maturityDate: string;
  purpose?: string;
  notes?: string;
  status: LoanAppStatus;
  createdById: string;
  createdBy?: User;
  reviewedById?: string;
  reviewedBy?: User;
  reviewRemark?: string;
  reviewedAt?: string;
  createdAt: string;
  documents?: { id: string; type: string; url: string }[];
}

/* ─── Loan Account ─── */
export interface LoanAccount {
  id: string;
  accountNo: string;
  applicationId: string;
  application?: LoanApplication;
  customerId: string;
  customer?: Customer;
  branchId: string;
  branch?: Branch;
  assignedEmployeeId: string;
  assignedEmployee?: User;
  loanType: LoanType;
  principal: number;
  interestAmount: number;
  totalPayable: number;
  installmentAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  penaltyAmount: number;
  disbursedAt: string;
  disbursementMode: DisbursementMode;
  startDate: string;
  maturityDate: string;
  nextDueDate?: string;
  status: LoanStatus;
  closedAt?: string;
  createdAt: string;
  schedules?: RepaymentSchedule[];
  payments?: Payment[];
}

/* ─── Repayment Schedule ─── */
export interface RepaymentSchedule {
  id: string;
  loanAccountId: string;
  installmentNo: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  status: InstallmentStatus;
  paidAt?: string;
  penaltyAmount: number;
}

/* ─── Payment ─── */
export interface Payment {
  id: string;
  receiptNo: string;
  loanAccountId: string;
  scheduleId?: string;
  amount: number;
  penalty: number;
  mode: PaymentMode;
  collectedById: string;
  collectedBy?: User;
  collectedAt: string;
  note?: string;
  geoLat?: number;
  geoLng?: number;
  clientRef?: string;
  isReversed: boolean;
  reversedReason?: string;
}

/* ─── Collection Due Item ─── */
export interface DueItem {
  id: string;
  installmentNo: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  status: InstallmentStatus;
  penaltyAmount: number;
  loanAccount: {
    id: string;
    accountNo: string;
    loanType: LoanType;
    installmentAmount: number;
    principal: number;
    totalPayable: number;
    paidAmount: number;
    pendingAmount: number;
    status: LoanStatus;
    assignedEmployee?: { id: string; name: string };
    customer: {
      id: string;
      customerCode: string;
      fullName: string;
      mobile: string;
      photoUrl?: string;
    };
    branch?: { id: string; code: string; name: string };
  };
}

export interface DueSummary {
  totalCustomers: number;
  totalDue: number;
  totalCollected: number;
  pendingCollection: number;
  pending: number;
  paid: number;
  partial: number;
  missed: number;
}

/* ─── Notification ─── */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

/* ─── Audit Log ─── */
export interface AuditLog {
  id: string;
  userId: string;
  user?: { name: string; loginId: string };
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

/* ─── Report ─── */
export interface ReportResult {
  title: string;
  columns: { key: string; label: string; align?: string }[];
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
}

/* ─── API Response Wrappers ─── */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedData<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ─── Navigation Param Lists ─── */
export type AuthStackParamList = {
  Login: undefined;
};

export type AdminTabParamList = {
  DashboardTab: undefined;
  CollectionsTab: undefined;
  ApplicationsTab: undefined;
  CustomersTab: undefined;
  MoreTab: undefined;
};

export type EmployeeTabParamList = {
  DashboardTab: undefined;
  CollectionsTab: undefined;
  CustomersTab: undefined;
  LoansTab: undefined;
  MoreTab: undefined;
};

export type SharedStackParamList = {
  Dashboard: undefined;
  Collections: undefined;
  CollectionPay: { item: DueItem };
  Customers: undefined;
  CustomerDetail: { id: string };
  CreateCustomer: undefined;
  Loans: undefined;
  LoanDetail: { id: string };
  Profile: undefined;
  Notifications: undefined;
};

export type AdminStackParamList = SharedStackParamList & {
  Branches: undefined;
  BranchDetail: { id: string };
  CreateBranch: undefined;
  Employees: undefined;
  EmployeeDetail: { id: string };
  CreateEmployee: undefined;
  LoanApplications: undefined;
  LoanApplicationDetail: { id: string };
  CreateLoanApplication: { customerId?: string };
  Reports: undefined;
  ReportView: { type: string; title: string };
  AuditLogs: undefined;
  Settings: undefined;
};

export type EmployeeStackParamList = SharedStackParamList & {
  Performance: undefined;
  CreateLoanApplication: { customerId?: string };
  LoanApplications: undefined;
  LoanApplicationDetail: { id: string };
};
