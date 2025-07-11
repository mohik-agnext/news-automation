import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'No session found'
      });
    }
    
    const validation = await validateSession(sessionId);
    
    if (validation.valid && validation.user) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: validation.user
      });
    } else {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: 'Invalid session'
      });
    }
    
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: 'Session validation failed'
    });
  }
} 