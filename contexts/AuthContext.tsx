import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, AuthContextType } from '../types';
import { adaptiveDb } from '../services/adaptiveApi';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Update adaptive API service when auth status changes
  useEffect(() => {
    adaptiveDb.setAuthStatus(!!user);
  }, [user]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<void> => {
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Signup failed');
      }

      setUser(data.user);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const googleLogin = async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Google login failed');
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    googleLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}