import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    if (!session || typeof (session as any).session_id !== 'string') {
      return NextResponse.json({
        error: 'Session object missing session_id'
      }, { status: 401 });
    }
    type SessionType = { session_id: string; isAuthenticated: boolean; user: any };
    const sessionTyped = session as SessionType;
    const session_id = sessionTyped.session_id;
    
    return NextResponse.json({
      sessionId: sessionTyped.session_id,
      authenticated: sessionTyped.isAuthenticated,
      user: sessionTyped.user
    });
    
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({
      error: 'Session validation failed'
    }, { status: 500 });
  }
} 