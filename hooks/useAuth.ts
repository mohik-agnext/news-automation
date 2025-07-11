'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    authenticated: false
  });

  // Check authentication status on mount and when needed
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setAuthState({
          user: data.user,
          loading: false,
          authenticated: true
        });
      } else {
        setAuthState({
          user: null,
          loading: false,
          authenticated: false
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthState({
        user: null,
        loading: false,
        authenticated: false
      });
    }
  };

  // Login function
  const login = (user: User) => {
    setAuthState({
      user,
      loading: false,
      authenticated: true
    });
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    
    setAuthState({
      user: null,
      loading: false,
      authenticated: false
    });
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return {
    ...authState,
    login,
    logout,
    checkAuth
  };
} 