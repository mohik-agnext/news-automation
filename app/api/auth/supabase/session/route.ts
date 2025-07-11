import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, refreshSession } from '@/lib/auth-supabase';

export async function GET(request: NextRequest) {
  try {
    const result = await getCurrentUser(request);
    
    if (result.user) {
      const response = NextResponse.json({
        success: true,
        authenticated: true,
        user: result.user
      });

      // If we got a refreshed session, update the cookies
      if (result.session) {
        response.cookies.set('supabase-auth-token', result.session.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/'
        });

        response.cookies.set('supabase-refresh-token', result.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/'
        });
      }

      return response;
    } else {
      const response = NextResponse.json({
        success: false,
        authenticated: false,
        error: result.error || 'Not authenticated'
      });

      // Clear invalid tokens
      if (result.error && (result.error.includes('Invalid token') || result.error.includes('expired'))) {
        response.cookies.set('supabase-auth-token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });

        response.cookies.set('supabase-refresh-token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });

        response.cookies.set('auth-status', '', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 0,
          path: '/'
        });
      }

      return response;
    }
    
  } catch (error) {
    console.error('❌ Session check error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: 'Session validation failed'
    }, { status: 500 });
  }
} 