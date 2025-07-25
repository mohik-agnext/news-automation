import { useState, useEffect, useCallback } from 'react';
import { ProcessedArticle } from '@/types/article';

interface BookmarkData {
  id: string;
  session_id: string;
  article_id: string;
  article_url: string;
  article_title: string;
  article_source: string;
  created_at: string;
  summary: string | null;
  tags: string | null;
  relevance_score: number | null;
  webhook_processed: boolean | null;
  processing_status: string | null;
  enriched_data: string | null;
}

interface OptimisticOperation {
  articleId: string;
  operation: 'add' | 'remove';
  timestamp: number;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [bookmarkData, setBookmarkData] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [optimisticOperations, setOptimisticOperations] = useState<OptimisticOperation[]>([]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('agnext_bookmarks');
    if (savedBookmarks) {
      try {
        const parsed = JSON.parse(savedBookmarks);
        setBookmarks(new Set(parsed));
      } catch (error) {
        console.error('Error parsing saved bookmarks:', error);
      }
    }
  }, []);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('agnext_bookmarks', JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  // Clean up old optimistic operations (older than 10 seconds)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setOptimisticOperations(prev => 
        prev.filter(op => now - op.timestamp < 10000)
      );
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  // Function to trigger LinkedIn content generation
  const triggerLinkedInGeneration = async (article: ProcessedArticle, sessionId: string) => {
    try {
      console.log('🚀 Triggering LinkedIn content generation for:', article.title);
      
      const webhookUrl = process.env.NEXT_PUBLIC_LINKEDIN_WEBHOOK_URL || 'https://mohik-server.app.n8n.cloud/webhook/linkedin';
      
      const payload = {
        session_id: sessionId,
        article: {
          id: article.id,
          url: article.url,
          title: article.title,
          source: article.source,
          description: article.description,
          content: article.content
        },
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending to n8n webhook:', payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('⚠️ LinkedIn content generation request failed:', response.status);
      } else {
        console.log('✅ LinkedIn content generation triggered successfully');
      }
    } catch (error) {
      console.error('❌ Error triggering LinkedIn content generation:', error);
    }
  };

  const toggleBookmark = useCallback(async (article: ProcessedArticle) => {
    const articleId = article.id;
    const isCurrentlyBookmarked = bookmarks.has(articleId);
    const operation: OptimisticOperation = {
      articleId,
      operation: isCurrentlyBookmarked ? 'remove' : 'add',
      timestamp: Date.now()
    };
    
    try {
      // 🚀 OPTIMISTIC UPDATE - Update UI immediately
      setOptimisticOperations(prev => [...prev, operation]);
      
      if (isCurrentlyBookmarked) {
        setBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
        console.log('⚡ Optimistic removal:', article.title);
      } else {
        setBookmarks(prev => new Set(prev).add(articleId));
        console.log('⚡ Optimistic addition:', article.title);
      }

      // 🔄 Background API call
      if (isCurrentlyBookmarked) {
        // Remove bookmark
        const response = await fetch('/api/bookmarks', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ articleId }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove bookmark');
        }

        console.log('✅ Server confirmed bookmark removal:', article.title);
      } else {
        // Add bookmark
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            articleId: article.id,
            articleUrl: article.url,
            articleTitle: article.title,
            articleSource: article.source,
            summary: article.description,
            relevanceScore: article.relevanceScore,
            publishedAt: article.publishedAt
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add bookmark');
        }

        const data = await response.json();
        console.log('✅ Server confirmed bookmark addition:', article.title);

        // 🚀 AUTOMATICALLY TRIGGER LINKEDIN CONTENT GENERATION
        if (data.success && data.sessionId) {
          // Fire and forget - don't wait for completion
          triggerLinkedInGeneration(article, data.sessionId).catch(error => {
            console.warn('LinkedIn generation failed but bookmark succeeded:', error);
          });
        }
      }

      // Remove the optimistic operation since it succeeded
      setOptimisticOperations(prev => 
        prev.filter(op => op.timestamp !== operation.timestamp)
      );

    } catch (error) {
      console.error('❌ Bookmark operation failed, reverting optimistic update:', error);
      
      // 🔄 REVERT OPTIMISTIC UPDATE on failure
      if (isCurrentlyBookmarked) {
        setBookmarks(prev => new Set(prev).add(articleId));
      } else {
        setBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
      }

      // Remove the failed optimistic operation
      setOptimisticOperations(prev => 
        prev.filter(op => op.timestamp !== operation.timestamp)
      );

      // TODO: Show user notification about the error
      console.error('Bookmark operation failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [bookmarks]);

  const isBookmarked = useCallback((articleId: string) => {
    return bookmarks.has(articleId);
  }, [bookmarks]);

  const getBookmarkCount = useCallback(() => {
    return bookmarks.size;
  }, [bookmarks]);

  const syncBookmarks = useCallback(async () => {
    try {
      setSyncLoading(true);
      console.log('🔄 Syncing bookmarks with Supabase...');
      
      const response = await fetch('/api/bookmarks/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          localBookmarks: Array.from(bookmarks)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync bookmarks');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state with server bookmarks
        const serverBookmarkIds = data.bookmarks.map((b: BookmarkData) => b.article_id);
        setBookmarks(new Set(serverBookmarkIds));
        setBookmarkData(data.bookmarks);
        setLastSyncTime(new Date());
        console.log('✅ Bookmarks synced successfully:', data.bookmarks.length, 'bookmarks');
      }
    } catch (error) {
      console.error('❌ Error syncing bookmarks:', error);
    } finally {
      setSyncLoading(false);
    }
  }, [bookmarks]);

  const refreshBookmarks = useCallback(async () => {
    try {
      console.log('🔄 Refreshing bookmarks from Supabase...');
      
      const response = await fetch('/api/bookmarks', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }

      const data = await response.json();
      
      if (data.success && data.bookmarks) {
        const serverBookmarkIds = data.bookmarks.map((b: BookmarkData) => b.article_id);
        setBookmarks(new Set(serverBookmarkIds));
        setBookmarkData(data.bookmarks);
        console.log('✅ Refreshed bookmarks:', data.bookmarks.length, 'bookmarks');
      }
    } catch (error) {
      console.error('❌ Error refreshing bookmarks:', error);
    }
  }, []);

  const clearAllBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🗑️ Clearing all bookmarks...');
      
      // Optimistic update
      const previousBookmarks = new Set(bookmarks);
      setBookmarks(new Set());
      
      const response = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ clearAll: true }),
      });

      if (!response.ok) {
        // Revert on failure
        setBookmarks(previousBookmarks);
        throw new Error('Failed to clear bookmarks');
      }

      setBookmarkData([]);
      console.log('✅ All bookmarks cleared');
    } catch (error) {
      console.error('❌ Error clearing bookmarks:', error);
    } finally {
      setLoading(false);
    }
  }, [bookmarks]);

  return {
    toggleBookmark,
    isBookmarked,
    getBookmarkCount,
    syncBookmarks,
    refreshBookmarks,
    clearAllBookmarks,
    bookmarks: Array.from(bookmarks),
    bookmarkData,
    loading,
    syncLoading,
    lastSyncTime,
    optimisticOperations: optimisticOperations.length
  };
} 