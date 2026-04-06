import api from './client';
import { DueItem, DueSummary, Payment, PaymentMode } from '../types';

export interface DueListParams {
  date: string;
  branchId?: string;
  employeeId?: string;
  loanType?: string;
  status?: string;
  q?: string;
  mode?: 'DUE_ON' | 'DUE_UPTO';
}

export interface PaymentData {
  loanAccountId: string;
  scheduleId?: string;
  amount: number;
  penalty?: number;
  mode: PaymentMode;
  note?: string;
  geoLat?: number;
  geoLng?: number;
  clientRef?: string;
}

export const collectionApi = {
  getDueList(params: DueListParams) {
    const query: Record<string, string | undefined> = {
      date: params.date,
    };
    if (params.branchId) query.branchId = params.branchId;
    if (params.employeeId) query.employeeId = params.employeeId;
    if (params.loanType) query.loanType = params.loanType;
    if (params.status) query.status = params.status;
    if (params.q) query.q = params.q;
    if (params.mode) query.mode = params.mode;
    return api.get<{ rows: DueItem[]; summary: DueSummary }>('/collections/due', query);
  },

  recordPayment(data: PaymentData) {
    return api.post<Payment>('/collections/pay', data as unknown as Record<string, unknown>);
  },
};
