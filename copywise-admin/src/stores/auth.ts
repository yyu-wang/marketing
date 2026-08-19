import { create } from 'zustand';

const AUTH_STORAGE_KEY = 'admin-auth';

interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const getInitialAuthState = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const { user, token } = JSON.parse(raw);
      if (user && token) {
        return {
          user: user as AuthUser,
          token: token as string,
          isLoggedIn: true,
          isAdmin: user.role === 'admin',
        };
      }
    }
  } catch {
    /* corrupted data — reset to unauthenticated */
  }
  return { user: null, token: null, isLoggedIn: false, isAdmin: false };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialAuthState(),

  login: (user, token) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
    set({ user, token, isLoggedIn: true, isAdmin: user.role === 'admin' });
  },

  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ user: null, token: null, isLoggedIn: false, isAdmin: false });
  },
}));
