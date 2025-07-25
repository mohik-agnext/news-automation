import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import RedisCache from '@/lib/redis';
import { articlesStore } from '@/lib/articlesStore';
import { getSessionPerformanceStats } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    if (!session || typeof (session as any).session_id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Session object missing session_id'
      }, { status: 401 });
    }
    const session_id = (session as { session_id: string }).session_id;
    
    // Gather performance metrics
    const redisMetrics = RedisCache.getMetrics();
    const sessionMetrics = getSessionPerformanceStats();
    const articleStoreMetrics = articlesStore.getPerformanceStats();
    
    // Calculate overall performance improvements
    const totalCacheHits = redisMetrics.cacheHits + sessionMetrics.cacheHits + articleStoreMetrics.cacheHits;
    const totalCacheMisses = redisMetrics.cacheMisses + sessionMetrics.cacheMisses + articleStoreMetrics.cacheMisses;
    const totalOperations = redisMetrics.totalOperations + sessionMetrics.totalLookups + articleStoreMetrics.totalOperations;
    
    const overallHitRate = totalOperations > 0 ? (totalCacheHits / totalOperations) * 100 : 0;
    
    // Estimate performance improvements
    const estimatedImprovements = {
      articleLoading: {
        before: '200-500ms (file I/O)',
        after: `${Math.round(redisMetrics.averageResponseTime)}ms (Redis cache)`,
        improvement: `${Math.round(((400 - redisMetrics.averageResponseTime) / 400) * 100)}% faster`
      },
      sessionValidation: {
        before: '50-150ms (database lookup)',
        after: `${Math.round(sessionMetrics.averageResponseTime)}ms (Redis cache)`,
        improvement: `${Math.round(((100 - sessionMetrics.averageResponseTime) / 100) * 100)}% faster`
      },
      bookmarkChecks: {
        before: '100-300ms (database query)',
        after: '1-5ms (Redis Set)',
        improvement: '95-99% faster'
      }
    };

    const performanceData = {
      success: true,
      timestamp: new Date().toISOString(),
      session_id: session_id,
      
      // Overall metrics
      overall: {
        totalOperations,
        totalCacheHits,
        totalCacheMisses,
        hitRate: Math.round(overallHitRate * 100) / 100,
        averageResponseTime: Math.round(
          (redisMetrics.averageResponseTime + sessionMetrics.averageResponseTime + articleStoreMetrics.averageResponseTime) / 3
        )
      },
      
      // Component-specific metrics
      redis: {
        ...redisMetrics,
        status: 'connected'
      },
      
      sessions: {
        ...sessionMetrics,
        description: 'User session caching performance'
      },
      
      articles: {
        ...articleStoreMetrics,
        description: 'Article storage and retrieval performance'
      },
      
      // Performance improvements
      improvements: estimatedImprovements,
      
      // Recommendations
      recommendations: [
        overallHitRate < 50 ? 'Cache hit rate is low - consider increasing TTL values' : null,
        redisMetrics.averageResponseTime > 50 ? 'Redis response time is high - check Redis server performance' : null,
        totalOperations < 10 ? 'Not enough operations to provide meaningful metrics' : null
      ].filter(Boolean),
      
      // Cache status
      cacheStatus: {
        redis: redisMetrics.totalOperations > 0 ? 'active' : 'inactive',
        articles: articleStoreMetrics.totalOperations > 0 ? 'active' : 'inactive',
        sessions: sessionMetrics.totalLookups > 0 ? 'active' : 'inactive'
      }
    };

    return NextResponse.json(performanceData);
    
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { action } = await request.json();
    
    switch (action) {
      case 'clear_cache':
        await RedisCache.flushAll();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully'
        });
        
      case 'warmup_cache':
        await articlesStore.warmupCache();
        return NextResponse.json({
          success: true,
          message: 'Cache warmed up successfully'
        });
        
      case 'benchmark':
        // Run a simple benchmark
        const startTime = Date.now();
        const testOperations = 10;
        
        for (let i = 0; i < testOperations; i++) {
          await RedisCache.set(`benchmark_${i}`, { test: 'data', timestamp: Date.now() }, 60);
          await RedisCache.get(`benchmark_${i}`);
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / testOperations;
        
        return NextResponse.json({
          success: true,
          benchmark: {
            operations: testOperations,
            totalTime: `${totalTime}ms`,
            averageTime: `${avgTime}ms`,
            operationsPerSecond: Math.round(1000 / avgTime)
          }
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error in performance action:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute performance action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 