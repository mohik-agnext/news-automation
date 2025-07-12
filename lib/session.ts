import { NextRequest } from 'next/server';
import { getCurrentUser } from './auth-supabase';
import RedisCache, { CacheKeys } from './redis';

const SESSION_CACHE_TTL = 86400; // 24 hours

// Performance tracking for session operations
interface SessionPerformanceStats {
  cacheHits: number;
  cacheMisses: number;
  totalLookups: number;
  averageResponseTime: number;
}

const sessionStats: SessionPerformanceStats = {
  cacheHits: 0,
  cacheMisses: 0,
  totalLookups: 0,
  averageResponseTime: 0
};

// Enhanced session function for authenticated users only with Redis caching
export async function getCurrentSession(request: NextRequest) {
  const startTime = Date.now();
  sessionStats.totalLookups++;
  
  try {
    // Try to get session from cache first
    const sessionCacheKey = CacheKeys.session('temp-lookup');
    
    const authResult = await getCurrentUser(request);
    
    if (authResult.user) {
      const sessionId = `user-${authResult.user.id}`;
      const actualCacheKey = CacheKeys.session(sessionId);
      
      // Check if session is cached
      const cachedSession = await RedisCache.get(actualCacheKey);
      if (cachedSession) {
        sessionStats.cacheHits++;
        const responseTime = Date.now() - startTime;
        sessionStats.averageResponseTime = 
          (sessionStats.averageResponseTime * (sessionStats.totalLookups - 1) + responseTime) / sessionStats.totalLookups;
        
        console.log(`🚀 Session cache HIT: ${sessionId} (${responseTime}ms)`);
        return cachedSession;
      }
      
      // Cache miss - create session object
      sessionStats.cacheMisses++;
      const session = {
        session_id: sessionId,
        isAuthenticated: true,
        user: authResult.user
      };
      
      // Cache the session
      await RedisCache.set(actualCacheKey, session, SESSION_CACHE_TTL);
      
      const responseTime = Date.now() - startTime;
      sessionStats.averageResponseTime = 
        (sessionStats.averageResponseTime * (sessionStats.totalLookups - 1) + responseTime) / sessionStats.totalLookups;
      
      console.log(`📖 Session cache MISS: ${sessionId}, cached for future requests (${responseTime}ms)`);
      return session;
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error);
  }
  
  // Return null if not authenticated - no anonymous sessions
  return null;
}

/**
 * Get session performance statistics
 */
export function getSessionPerformanceStats(): SessionPerformanceStats & { hitRate: number } {
  const hitRate = sessionStats.totalLookups > 0 
    ? (sessionStats.cacheHits / sessionStats.totalLookups) * 100 
    : 0;
  
  return {
    ...sessionStats,
    hitRate: Math.round(hitRate * 100) / 100
  };
}

/**
 * Clear session from cache (useful for logout)
 */
export async function clearSessionCache(sessionId: string): Promise<void> {
  try {
    const cacheKey = CacheKeys.session(sessionId);
    await RedisCache.del(cacheKey);
    console.log(`🗑️ Session cache cleared: ${sessionId}`);
  } catch (error) {
    console.error('Error clearing session cache:', error);
  }
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