import { NextRequest, NextResponse } from 'next/server';
import { signInUser } from '@/lib/auth-supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // Sign in with Supabase Auth
    const result = await signInUser(email, password);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 401 });
    }

    console.log('✅ User logged in successfully:', email);

    const response = NextResponse.json({
      success: true,
      user: result.session!.user,
      message: 'Logged in successfully'
    });

    // Set auth token as HTTP-only cookie
    if (result.session) {
      response.cookies.set('supabase-auth-token', result.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      // Also set refresh token
      response.cookies.set('supabase-refresh-token', result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });

      // Set a simple auth flag for frontend to check
      response.cookies.set('auth-status', 'authenticated', {
        httpOnly: false, // Allow frontend to read this one
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });
    }

    return response;

  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 500 });
  }
} 