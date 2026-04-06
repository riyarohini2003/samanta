import api from './client';
import { LoanApplication, LoanType } from '../types';

export interface LoanAppListParams {
  status?: string;
  branchId?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface LoanAppCreateData {
  customerId: string;
  loanType: LoanType;
  principal: number;
  interestRate: number;
  processingFee?: number;
  tenureCount: number;
  startDate: string;
  purpose?: string;
  notes?: string;
  interestMethod?: 'SIMPLE' | 'COMPOUND';
  ratePeriod?: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  documents?: { type: string; url: string }[];
}

export interface LoanCalcResult {
  principal: number;
  interestAmount: number;
  processingFee: number;
  totalPayable: number;
  installmentAmount: number;
  startDate: string;
  maturityDate: string;
  effectiveAnnualRate: number;
}

export const loanApplicationApi = {
  list(params?: LoanAppListParams) {
    const query: Record<string, string | undefined> = {};
    if (params?.status) query.status = params.status;
    if (params?.branchId) query.branchId = params.branchId;
    if (params?.employeeId) query.employeeId = params.employeeId;
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    return api.get<{ rows: LoanApplication[]; total: number }>('/loan-applications', query);
  },

  get(id: string) {
    return api.get<LoanApplication>(`/loan-applications/${id}`);
  },

  create(data: LoanAppCreateData) {
    return api.post<LoanApplication>('/loan-applications', data as unknown as Record<string, unknown>);
  },

  update(id: string, data: Partial<LoanAppCreateData>) {
    return api.patch<LoanApplication>(`/loan-applications/${id}`, data as unknown as Record<string, unknown>);
  },

  calculate(data: Omit<LoanAppCreateData, 'customerId' | 'purpose' | 'notes' | 'documents'>) {
    return api.post<LoanCalcResult>('/loan-applications/calculate', data as unknown as Record<string, unknown>);
  },

  approve(id: string, remark?: string) {
    return api.post<LoanApplication>(`/loan-applications/${id}/approve`, { remark });
  },

  reject(id: string, remark: string) {
    return api.post<LoanApplication>(`/loan-applications/${id}/reject`, { remark });
  },

  disburse(id: string, data: { disbursementMode: string; assignedEmployeeId: string; disbursedAt?: string }) {
    return api.post<unknown>(`/loan-applications/${id}/disburse`, data);
  },
};
