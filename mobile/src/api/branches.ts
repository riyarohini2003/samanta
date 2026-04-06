import api from './client';
import { Branch } from '../types';

export interface BranchListParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface BranchCreateData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactNumber: string;
  managerId?: string;
}

export const branchApi = {
  list(params?: BranchListParams) {
    const query: Record<string, string | undefined> = {};
    if (params?.q) query.q = params.q;
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    return api.get<{ rows: Branch[]; total: number }>('/branches', query);
  },

  get(id: string) {
    return api.get<Branch>(`/branches/${id}`);
  },

  create(data: BranchCreateData) {
    return api.post<Branch>('/branches', data as unknown as Record<string, unknown>);
  },

  update(id: string, data: Partial<BranchCreateData> & { isActive?: boolean }) {
    return api.patch<Branch>(`/branches/${id}`, data as unknown as Record<string, unknown>);
  },

  delete(id: string) {
    return api.delete<void>(`/branches/${id}`);
  },
};
