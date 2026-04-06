import api from './client';
import { Customer } from '../types';

export interface CustomerListParams {
  q?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface CustomerCreateData {
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
  photoUrl?: string;
  documents?: { type: string; url: string }[];
}

export const customerApi = {
  list(params?: CustomerListParams) {
    const query: Record<string, string | undefined> = {};
    if (params?.q) query.q = params.q;
    if (params?.branchId) query.branchId = params.branchId;
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    return api.get<{ rows: Customer[]; total: number }>('/customers', query);
  },

  get(id: string) {
    return api.get<Customer>(`/customers/${id}`);
  },

  create(data: CustomerCreateData) {
    return api.post<Customer>('/customers', data as unknown as Record<string, unknown>);
  },

  update(id: string, data: Partial<CustomerCreateData>) {
    return api.patch<Customer>(`/customers/${id}`, data as unknown as Record<string, unknown>);
  },

  checkEligibility(id: string) {
    return api.get<{ eligible: boolean; reason?: string }>(`/customers/${id}/loan-eligibility`);
  },
};
