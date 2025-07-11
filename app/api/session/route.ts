import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    if (!session) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    return NextResponse.json({
      sessionId: session.session_id,
      authenticated: session.isAuthenticated,
      user: session.user
    });
    
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({
      error: 'Session validation failed'
    }, { status: 500 });
  }
} 