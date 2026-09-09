// ==========================================================
// src/stores/authStore.ts
// مخزن حالة المصادقة والمستخدم الحالي والصلاحيات
// ==========================================================

import { create } from "zustand";
import { UserWithRoleDTO } from "@/database/repositories/userRepository";
import { authService } from "@/services/authService";

interface AuthState {
  user: UserWithRoleDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserWithRoleDTO | null) => void;
  hasPermission: (permissionCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await authService.login(username, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const { user } = get();
    if (user) {
      await authService.logout(user);
    }
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  hasPermission: (permissionCode: string) => {
    const { user } = get();
    if (!user) return false;
    // Manager has all permissions
    if (user.role_id === "role-manager") return true;
    return (user.permissions || []).includes(permissionCode);
  },
}));
