import api from './client';
import { User } from '../types';

export interface EmployeeListParams {
  q?: string;
  branchId?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface EmployeeCreateData {
  name: string;
  loginId: string;
  password: string;
  email?: string;
  mobile: string;
  role: 'ADMIN' | 'BRANCH_MANAGER' | 'EMPLOYEE';
  branchId: string;
  address?: string;
  joiningDate?: string;
}

export const employeeApi = {
  list(params?: EmployeeListParams) {
    const query: Record<string, string | undefined> = {};
    if (params?.q) query.q = params.q;
    if (params?.branchId) query.branchId = params.branchId;
    if (params?.role) query.role = params.role;
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    return api.get<{ rows: User[]; total: number }>('/employees', query);
  },

  get(id: string) {
    return api.get<User>(`/employees/${id}`);
  },

  create(data: EmployeeCreateData) {
    return api.post<User>('/employees', data as unknown as Record<string, unknown>);
  },

  update(id: string, data: Partial<Omit<EmployeeCreateData, 'loginId' | 'password'>> & { isActive?: boolean }) {
    return api.patch<User>(`/employees/${id}`, data as unknown as Record<string, unknown>);
  },

  resetPassword(id: string, newPassword: string) {
    return api.post<void>(`/employees/${id}/reset-password`, { newPassword });
  },
};
