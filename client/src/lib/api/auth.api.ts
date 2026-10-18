import { apiClient } from './client';
import type { User } from '@/types';

export interface RegisterDTO {
  email: string;
  username: string;
  display_name: string;
  password: string;
}

export interface LoginDTO {
  otp?: string;
  email?: string;
  username?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  register: async (data: RegisterDTO): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  login: async (data: LoginDTO): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  uploadAvatar: async (file: File): Promise<{url:string}> => {
    const form = new FormData();
    form.append("file",file);
    return (await apiClient.post<{url:string}>("/auth/me/avatar",form,{headers:{"Content-Type":"multipart/form-data"}})).data;
  },

  updateMe: async (data: { display_name?: string; avatar_url?: string }): Promise<User> => {
    const res = await apiClient.put<User>('/auth/me', data);
    return res.data;
  },
};
