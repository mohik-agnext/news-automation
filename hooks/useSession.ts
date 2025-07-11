import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthenticatedSession {
  sessionId: string;
  authenticated: true;
  user: User;
}

export function useSession() {
  const [session, setSession] = useState<AuthenticatedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated by reading the auth status cookie
        const isAuthenticated = document.cookie.includes('auth-status=authenticated');
        
        if (isAuthenticated) {
          // Try authenticated session
          const authResponse = await fetch('/api/auth/supabase/session', {
            credentials: 'include' // Include cookies
          });
          
          if (authResponse.ok) {
            const authData = await authResponse.json();
            if (authData.success && authData.authenticated && authData.user) {
              // Authenticated user
              setSession({
                sessionId: `user-${authData.user.id}`,
                authenticated: true,
                user: authData.user
              });
              setError(null);
              return;
            }
          } else {
            // Auth failed, clear the auth status cookie
            document.cookie = 'auth-status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
        }
        
        // No authentication - set session to null
        setSession(null);
        setError('Authentication required');
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching session:', err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  return {
    session,
    loading,
    error,
    isAuthenticated: !!session
  };
} 