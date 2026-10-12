import "@/lib/brandStorage";
import { create } from "zustand";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem("mission_control_token"),
  isAuthenticated: !!localStorage.getItem("mission_control_token"),

  setAuth: (user, token) => {
    localStorage.setItem("mission_control_token", token);
    set({ user, token, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem("mission_control_token");
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
