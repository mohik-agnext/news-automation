import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    
    if (sessionId) {
      // Clean up session from storage
      await logoutUser(sessionId);
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    // Remove session cookie
    response.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Immediate expiry
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still remove cookie even if server cleanup fails
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    response.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    
    return response;
  }
} 