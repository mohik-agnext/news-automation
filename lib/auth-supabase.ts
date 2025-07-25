/**
 * Supabase Authentication System
 * Replaces file-based auth with proper Supabase Auth
 */

import { supabase } from './supabase';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Sign up a new user with email and password
 */
export async function signUpUser(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    });

    if (error) {
      console.error('❌ Sign up error:', error);
      return { success: false, error: error.message };
    }

    if (data.user) {
      console.log('✅ User signed up:', data.user.email);
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at
        }
      };
    }

    return { success: false, error: 'Failed to create user' };
  } catch (error) {
    console.error('❌ Sign up error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Sign in a user with email and password
 */
export async function signInUser(email: string, password: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: error.message };
    }

    if (data.session && data.user) {
      console.log('✅ User signed in:', data.user.email);
      
      // Ensure user session exists in our sessions table
      await ensureUserSession(data.user.id, data.user.email!);
      
      return {
        success: true,
        session: {
          user: {
            id: data.user.id,
            email: data.user.email!,
            created_at: data.user.created_at
          },
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0
        }
      };
    }

    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('❌ Sign in error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ User signed out');
    return { success: true };
  } catch (error) {
    console.error('❌ Sign out error:', error);
    return { success: false, error: 'Sign out failed' };
  }
}

/**
 * Get current authenticated user from request
 */
export async function getCurrentUser(request: NextRequest): Promise<{ user?: AuthUser; session?: AuthSession; error?: string }> {
  try {
    // Get the access token from cookies or headers
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('supabase-auth-token')?.value;
    const refreshToken = request.cookies.get('supabase-refresh-token')?.value;
    
    let token = authHeader?.replace('Bearer ', '') || cookieToken;
    
    if (!token && refreshToken) {
      // Try to refresh the token
      console.log('🔄 No access token, attempting to refresh...');
      const refreshResult = await refreshSession(refreshToken);
      if (refreshResult.success && refreshResult.session) {
        token = refreshResult.session.access_token;
        console.log('✅ Token refreshed successfully');
      }
    }
    
    if (!token) {
      console.log('❌ No authentication token available');
      return { error: 'No authentication token' };
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Token verification failed:', error);
      // Try refreshing the token if verification failed
      if (refreshToken) {
        console.log('🔄 Token verification failed, attempting refresh...');
        const refreshResult = await refreshSession(refreshToken);
        if (refreshResult.success && refreshResult.session) {
          // Try verification again with new token
          const { data: { user: refreshedUser }, error: refreshError } = await supabase.auth.getUser(refreshResult.session.access_token);
          if (!refreshError && refreshedUser) {
            await ensureUserSession(refreshedUser.id, refreshedUser.email!);
            return {
              user: {
                id: refreshedUser.id,
                email: refreshedUser.email!,
                created_at: refreshedUser.created_at
              },
              session: refreshResult.session
            };
          }
        }
      }
      return { error: 'Invalid token' };
    }

    // Ensure user session exists in our sessions table
    await ensureUserSession(user.id, user.email!);

    return {
      user: {
        id: user.id,
        email: user.email!,
        created_at: user.created_at
      }
    };
  } catch (error) {
    console.error('❌ Get current user error:', error);
    return { error: 'Failed to get current user' };
  }
}

/**
 * Ensure user session exists in our sessions table for bookmarks foreign key
 */
// Ensure user session exists in Supabase
async function ensureUserSession(userId: string): Promise<void> {
  try {
    const sessionId = `user-${userId}`;
    
    // Check if session already exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .single();

    if (!existingSession) {
      // Create session in our sessions table
      const { error } = await supabase
        .from('sessions')
        .insert({
          session_id: sessionId,
          ip_address: '127.0.0.1' // Placeholder for authenticated users
        });

      if (error) {
        console.error('❌ Error creating user session:', error);
      } else {
        console.log('✅ Created user session:', sessionId);
      }
    } else {
      // Update last accessed time
      const { error } = await supabase
        .from('sessions')
        .update({ last_accessed: new Date().toISOString() })
        .eq('session_id', sessionId);

      if (error) {
        console.error('❌ Error updating session:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error ensuring user session:', error);
  }
}

/**
 * Refresh user session
 */
export async function refreshSession(refreshToken: string): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      console.error('❌ Refresh session error:', error);
      return { success: false, error: error?.message || 'Failed to refresh session' };
    }

    console.log('✅ Session refreshed');
    return {
      success: true,
      session: {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          created_at: data.user!.created_at
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0
      }
    };
  } catch (error) {
    console.error('❌ Refresh session error:', error);
    return { success: false, error: 'Failed to refresh session' };
  }
}