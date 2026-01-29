import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, ApiError } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, username?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        setIsAdmin(response.data.role === 'admin');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If unauthorized, clear auth state
      if (error instanceof ApiError && error.status === 401) {
        api.clearToken();
        setUser(null);
        setIsAdmin(false);
      }
    }
  };

  useEffect(() => {
    // Check for existing auth on mount
    const initAuth = async () => {
      if (api.isLoggedIn()) {
        await fetchProfile();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      if (response.success && response.data) {
        setUser(response.data.user);
        setIsAdmin(response.data.user.role === 'admin');
        return { error: null };
      }
      return { error: new Error(response.message || 'Login failed') };
    } catch (error) {
      if (error instanceof ApiError) {
        return { error: new Error(error.message) };
      }
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, username?: string) => {
    try {
      const response = await api.register({
        email,
        password,
        full_name: fullName,
        username,
      });
      if (response.success && response.data) {
        setUser(response.data.user);
        setIsAdmin(response.data.user.role === 'admin');
        return { error: null };
      }
      return { error: new Error(response.message || 'Registration failed') };
    } catch (error) {
      if (error instanceof ApiError) {
        return { error: new Error(error.message) };
      }
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await api.logout();
    setUser(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (api.isLoggedIn()) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
