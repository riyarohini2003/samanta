import api from './client';
import { User, LoginResponse } from '../types';

export const authApi = {
  login(loginId: string, password: string) {
    return api.post<LoginResponse>('/auth/login', { loginId, password });
  },

  logout() {
    return api.post<void>('/auth/logout');
  },

  me() {
    return api.get<User>('/auth/me');
  },

  changePassword(currentPassword: string, newPassword: string) {
    return api.post<void>('/auth/change-password', { currentPassword, newPassword });
  },
};
