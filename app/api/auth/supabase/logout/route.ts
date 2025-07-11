import { NextRequest, NextResponse } from 'next/server';
import { signOutUser } from '@/lib/auth-supabase';

export async function POST(request: NextRequest) {
  try {
    // Sign out with Supabase Auth
    const result = await signOutUser();
    
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear auth cookies
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

    console.log('✅ User logged out successfully');
    return response;

  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 });
  }
} 