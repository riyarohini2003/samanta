import api from './client';
import { ReportResult } from '../types';

export interface ReportParams {
  type: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  employeeId?: string;
  loanType?: string;
  status?: string;
}

export const reportApi = {
  generate(params: ReportParams) {
    const query: Record<string, string | undefined> = {
      type: params.type,
    };
    if (params.date) query.date = params.date;
    if (params.dateFrom) query.dateFrom = params.dateFrom;
    if (params.dateTo) query.dateTo = params.dateTo;
    if (params.branchId) query.branchId = params.branchId;
    if (params.employeeId) query.employeeId = params.employeeId;
    if (params.loanType) query.loanType = params.loanType;
    if (params.status) query.status = params.status;
    return api.get<ReportResult>('/reports', query);
  },
};
