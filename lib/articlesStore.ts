import { Article } from '@/types/article';
import fs from 'fs';
import path from 'path';
import RedisCache, { CacheKeys } from './redis';

const STORAGE_FILE = path.join(process.cwd(), '.tmp-articles.json');
const CACHE_TTL = 300; // 5 minutes

// Performance tracking
interface PerformanceStats {
  cacheHits: number;
  cacheMisses: number;
  fileReads: number;
  fileWrites: number;
  totalOperations: number;
}

const performanceStats: PerformanceStats = {
  cacheHits: 0,
  cacheMisses: 0,
  fileReads: 0,
  fileWrites: 0,
  totalOperations: 0
};

// Enhanced articles store with Redis caching and file fallback
class ArticlesStore {
  private static instance: ArticlesStore;

  private constructor() {}

  public static getInstance(): ArticlesStore {
    if (!ArticlesStore.instance) {
      ArticlesStore.instance = new ArticlesStore();
    }
    return ArticlesStore.instance;
  }

  /**
   * Get articles with Redis caching and file fallback
   */
  public async getArticles(): Promise<Article[]> {
    const startTime = Date.now();
    performanceStats.totalOperations++;
    
    try {
      // Try Redis cache first
      const cacheKey = CacheKeys.articles();
      const cachedArticles = await RedisCache.get<Article[]>(cacheKey);
      
      if (cachedArticles) {
        performanceStats.cacheHits++;
        const responseTime = Date.now() - startTime;
        console.log(`🚀 ArticlesStore: Loaded ${cachedArticles.length} articles from Redis cache (${responseTime}ms)`);
        return cachedArticles;
      }
      
      // Cache miss - load from file
      performanceStats.cacheMisses++;
      const articles = this.getArticlesFromFile();
      
      // Cache the result for future requests
      if (articles.length > 0) {
        await RedisCache.set(cacheKey, articles, CACHE_TTL);
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`📖 ArticlesStore: Loaded ${articles.length} articles from file, cached for future requests (${responseTime}ms)`);
      return articles;
      
    } catch (error) {
      console.error('Error in getArticles:', error);
      // Fallback to file-only operation
      return this.getArticlesFromFile();
    }
  }

  /**
   * Synchronous file-based article retrieval (fallback)
   */
  private getArticlesFromFile(): Article[] {
    try {
      performanceStats.fileReads++;
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        const articles = JSON.parse(data);
        return articles;
      }
    } catch (error) {
      console.error('Error reading articles from file:', error);
    }
    return [];
  }

  /**
   * Synchronous version for backward compatibility
   */
  public getArticlesSync(): Article[] {
    return this.getArticlesFromFile();
  }

  /**
   * Set articles with Redis caching and file persistence
   */
  public async setArticles(articles: Article[]): Promise<void> {
    const startTime = Date.now();
    performanceStats.totalOperations++;
    
    try {
      // Save to file first (for persistence)
      this.setArticlesToFile(articles);
      
      // Update Redis cache
      const cacheKey = CacheKeys.articles();
      await RedisCache.set(cacheKey, articles, CACHE_TTL);
      
      const responseTime = Date.now() - startTime;
      console.log(`🚀 ArticlesStore: Stored ${articles.length} articles to file + Redis cache (${responseTime}ms)`);
      
    } catch (error) {
      console.error('Error in setArticles:', error);
      // Fallback to file-only operation
      this.setArticlesToFile(articles);
    }
  }

  /**
   * Synchronous file-based article storage (fallback)
   */
  private setArticlesToFile(articles: Article[]): void {
    try {
      performanceStats.fileWrites++;
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(articles, null, 2));
      console.log(`📦 ArticlesStore: Stored ${articles.length} articles to file`);
    } catch (error) {
      console.error('Error storing articles to file:', error);
    }
  }

  /**
   * Synchronous version for backward compatibility
   */
  public setArticlesSync(articles: Article[]): void {
    this.setArticlesToFile(articles);
    // Async cache update (fire and forget)
    this.updateCacheAsync(articles);
  }

  /**
   * Async cache update helper
   */
  private async updateCacheAsync(articles: Article[]): Promise<void> {
    try {
      const cacheKey = CacheKeys.articles();
      await RedisCache.set(cacheKey, articles, CACHE_TTL);
    } catch (error) {
      console.error('Error updating cache:', error);
    }
  }

  /**
   * Get article count (uses cached data if available)
   */
  public async getCount(): Promise<number> {
    const articles = await this.getArticles();
    return articles.length;
  }

  /**
   * Synchronous version for backward compatibility
   */
  public getCountSync(): number {
    return this.getArticlesFromFile().length;
  }

  /**
   * Clear articles from both cache and file
   */
  public async clear(): Promise<void> {
    const startTime = Date.now();
    performanceStats.totalOperations++;
    
    try {
      // Clear file
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE);
        console.log(`🗑️ ArticlesStore: Cleared articles file`);
      }
      
      // Clear Redis cache
      const cacheKey = CacheKeys.articles();
      await RedisCache.del(cacheKey);
      
      const responseTime = Date.now() - startTime;
      console.log(`🚀 ArticlesStore: Cleared articles from file + Redis cache (${responseTime}ms)`);
      
    } catch (error) {
      console.error('Error in clear:', error);
      // Fallback to file-only operation
      try {
        if (fs.existsSync(STORAGE_FILE)) {
          fs.unlinkSync(STORAGE_FILE);
          console.log(`🗑️ ArticlesStore: Cleared articles file`);
        }
      } catch (fileError) {
        console.error('Error clearing articles file:', fileError);
      }
    }
  }

  /**
   * Synchronous version for backward compatibility
   */
  public clearSync(): void {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE);
        console.log(`🗑️ ArticlesStore: Cleared articles file`);
      }
      // Async cache clear (fire and forget)
      this.clearCacheAsync();
    } catch (error) {
      console.error('Error clearing articles file:', error);
    }
  }

  /**
   * Async cache clear helper
   */
  private async clearCacheAsync(): Promise<void> {
    try {
      const cacheKey = CacheKeys.articles();
      await RedisCache.del(cacheKey);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): PerformanceStats & { 
    cacheHitRate: number;
    averageResponseTime: number;
  } {
    const cacheHitRate = performanceStats.totalOperations > 0 
      ? (performanceStats.cacheHits / performanceStats.totalOperations) * 100 
      : 0;
    
    const redisMetrics = RedisCache.getMetrics();
    
    return {
      ...performanceStats,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      averageResponseTime: redisMetrics.averageResponseTime
    };
  }

  /**
   * Warm up cache by loading articles
   */
  public async warmupCache(): Promise<void> {
    try {
      console.log('🔥 Warming up articles cache...');
      await this.getArticles();
      console.log('✅ Articles cache warmed up');
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  // Backward compatibility methods (synchronous versions)
  public getArticles(): Article[] {
    return this.getArticlesSync();
  }

  public setArticles(articles: Article[]): void {
    this.setArticlesSync(articles);
  }

  public getCount(): number {
    return this.getCountSync();
  }

  public clear(): void {
    this.clearSync();
  }
}

// Export singleton instance
export const articlesStore = ArticlesStore.getInstance(); 