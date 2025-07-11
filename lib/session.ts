import { NextRequest } from 'next/server';
import { getCurrentUser } from './auth-supabase';

// Enhanced session function for authenticated users only
export async function getCurrentSession(request: NextRequest) {
  try {
    const authResult = await getCurrentUser(request);
    
    if (authResult.user) {
      return {
        session_id: `user-${authResult.user.id}`,
        isAuthenticated: true,
        user: authResult.user
      };
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error);
  }
  
  // Return null if not authenticated - no anonymous sessions
  return null;
}

export function addBookmarkToSession(sessionId: string, articleId: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  
  if (!session.bookmarks.includes(articleId)) {
    session.bookmarks.push(articleId);
    sessionStore.set(sessionId, session);
    return true;
  }
  
  return false;
}

export function removeBookmarkFromSession(sessionId: string, articleId: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  
  const index = session.bookmarks.indexOf(articleId);
  if (index > -1) {
    session.bookmarks.splice(index, 1);
    sessionStore.set(sessionId, session);
    return true;
  }
  
  return false;
}

export function isArticleBookmarked(sessionId: string, articleId: string): boolean {
  const session = getSession(sessionId);
  return session ? session.bookmarks.includes(articleId) : false;
} 