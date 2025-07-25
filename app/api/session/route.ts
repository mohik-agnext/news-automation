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
    const session_id = (session as { session_id: string }).session_id;
    
    return NextResponse.json({
      sessionId: session_id,
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