import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createUserSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 });
    }

    // Authenticate user (or create if doesn't exist)
    const authResult = await authenticateUser({ username, password });
    
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: 401 });
    }

    // Create user session
    const session = await createUserSession(authResult.user!.id, authResult.user!.username);
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: authResult.user
    });

    // Set secure session cookie
    response.cookies.set('sessionId', session.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 500 });
  }
} 