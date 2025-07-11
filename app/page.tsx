'use client';

import { useState, useEffect } from 'react';
import ArticleGrid from '@/components/ArticleGrid';
import LoginForm from '@/components/LoginForm';

interface User {
  id: string;
  email: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/supabase/session', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch('/api/auth/supabase/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setLoginError(null);
      } else {
        setLoginError(data.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Network error. Please check your connection and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/supabase/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if server request fails
      setUser(null);
    }
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 mt-6 font-medium">Loading AgNext News Intelligence...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-400/10 to-transparent rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {/* Logo and branding */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl opacity-20 blur"></div>
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                AgNext News Intelligence
              </h1>
              <p className="text-gray-600 font-medium">AI-Powered Agriculture News Discovery</p>
            </div>

            {/* Login form card */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 text-center mb-2">Welcome Back</h2>
                <p className="text-sm text-gray-600 text-center">Sign in to access your personalized news feed</p>
              </div>
              
              <LoginForm 
                onLogin={handleLogin}
                loading={loginLoading}
                error={loginError}
              />
            </div>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
              <p className="text-sm text-blue-800 font-medium text-center mb-2">Demo Credentials</p>
              <div className="text-xs text-blue-700 text-center space-y-1">
                <div><strong>Email:</strong> demo@agnext.com</div>
                <div><strong>Password:</strong> demo123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <ArticleGrid 
      user={user} 
      onLogout={handleLogout}
    />
  );
} 