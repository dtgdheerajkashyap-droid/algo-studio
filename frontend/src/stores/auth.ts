/**
 * Auth store — current user, session bootstrap, login/logout.
 * Guest mode: user === null; catalog + visualizations work, but submit /
 * AI chat / dashboard require sign-in.
 */

import { create } from 'zustand';
import { api, ApiError } from '../lib/api';

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  has_password: boolean;
  has_google: boolean;
}

interface AuthState {
  user: User | null;
  /** false until the initial /auth/me probe completes. */
  ready: boolean;
  googleEnabled: boolean;
  aiConfigured: boolean;
  aiProvider: string | null;
  aiModel: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  googleEnabled: false,
  aiConfigured: false,
  aiProvider: null,
  aiModel: null,

  bootstrap: async () => {
    try {
      const cfg = await api.get<{
        google_enabled: boolean;
        configured: boolean;
        provider: string | null;
        model: string | null;
      }>('/auth/config');
      set({
        googleEnabled: cfg.google_enabled,
        aiConfigured: cfg.configured ?? false,
        aiProvider: cfg.provider ?? null,
        aiModel: cfg.model ?? null,
      });
    } catch {
      /* backend down — keep defaults */
    }
    try {
      const user = await api.get<User>('/auth/me');
      set({ user, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  login: async (email, password) => {
    const user = await api.post<User>('/auth/login', { email, password });
    set({ user });
  },

  register: async (email, name, password) => {
    const user = await api.post<User>('/auth/register', { email, name, password });
    set({ user });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    set({ user: null });
  },
}));
