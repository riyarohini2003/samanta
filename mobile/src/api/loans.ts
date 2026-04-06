import api from './client';
import { LoanAccount } from '../types';

export interface LoanListParams {
  status?: string;
  type?: string;
  branchId?: string;
  employeeId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export const loanApi = {
  list(params?: LoanListParams) {
    const query: Record<string, string | undefined> = {};
    if (params?.status) query.status = params.status;
    if (params?.type) query.type = params.type;
    if (params?.branchId) query.branchId = params.branchId;
    if (params?.employeeId) query.employeeId = params.employeeId;
    if (params?.q) query.q = params.q;
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    return api.get<{ rows: LoanAccount[]; total: number }>('/loans', query);
  },

  get(id: string) {
    return api.get<LoanAccount>(`/loans/${id}`);
  },
};
