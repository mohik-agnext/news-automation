'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useLinkedInContent } from '@/hooks/useLinkedInContent';
import { useRealtime } from '@/hooks/useRealtime';
import ArticleCard from './ArticleCard';
import LoadingGrid from './LoadingGrid';
import SearchHeader from './SearchHeader';
import SortDropdown from './SortDropdown';
import { ProcessedArticle } from '@/types/article';
import type { SortOption } from '@/types/article';

interface ArticleGridState {
  articles: ProcessedArticle[];
  loading: boolean;
  error: string | null;
  searchResultsCount: number;
  bookmarkedCount: number;
  lastUpdated: string | null;
  bookmarkedArticles?: ProcessedArticle[];
}

interface User {
  id: string;
  email: string;
}

interface ArticleGridProps {
  user?: User | null;
  onLogout?: () => void;
}

type ViewMode = 'all' | 'bookmarked';

export default function ArticleGrid({ user, onLogout }: ArticleGridProps) {
  // All hooks must be called before any conditional returns
  const { session, loading: sessionLoading, isAuthenticated } = useSession();
  const { toggleBookmark, isBookmarked, getBookmarkCount, syncLoading, optimisticOperations, lastSyncTime, refreshBookmarks } = useBookmarks();
  const { fetchLinkedInContent, getLinkedInContent } = useLinkedInContent();
  const { lastUpdate } = useRealtime();

  const [state, setState] = useState<ArticleGridState>({
    articles: [],
    loading: false,
    error: null,
    searchResultsCount: 0,
    bookmarkedCount: 0,
    lastUpdated: null,
    bookmarkedArticles: []
  });

  const [currentSort, setCurrentSort] = useState<SortOption['value']>('relevance');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const previousBookmarkCount = useRef(getBookmarkCount());

  // Function to fetch current bookmark count from server
  const updateBookmarkCount = useCallback(async () => {
    try {
      const response = await fetch('/api/bookmarks', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.bookmarks) {
        setState(prev => ({ 
          ...prev, 
          bookmarkedCount: data.bookmarks.length
        }));
        console.log('📊 Updated bookmark count:', data.bookmarks.length);
      }
    } catch (error) {
      console.error('❌ Error fetching bookmark count:', error);
    }
  }, []);

  const fetchArticles = useCallback(async (sortBy: SortOption['value'] = currentSort) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const params = new URLSearchParams({ sortBy });
      const response = await fetch(`/api/articles?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        articles: data.articles || [],
        searchResultsCount: data.totalCount || 0,
        bookmarkedCount: data.bookmarkedCount || 0,
        lastUpdated: data.lastUpdated,
        loading: false
      }));
      
    } catch (error) {
      console.error('Error fetching articles:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        loading: false
      }));
    }
  }, [currentSort]);

  const handleSortChange = useCallback((sortBy: SortOption['value']) => {
    setCurrentSort(sortBy);
    // Only fetch new articles if we're in the 'all' view AND have searched
    if (hasSearched && viewMode === 'all') {
      fetchArticles(sortBy);
    }
    // For bookmark view, sorting is handled by the filteredArticles useMemo
  }, [fetchArticles, hasSearched, viewMode]);

  const handleNewArticlesNotification = useCallback(() => {
    if (hasSearched) {
      fetchArticles();
    }
  }, [fetchArticles, hasSearched]);

  // Convert bookmark data to article format for display
  const convertBookmarksToArticles = useCallback((bookmarkData: any[]) => {
    return bookmarkData.map((bookmark: any): ProcessedArticle => {
      // Use article_published_at if available, otherwise fall back to created_at
      let publishedAt = bookmark.article_published_at || bookmark.created_at;
      
      // Manual date extraction if article_published_at is null and we have a timestamped ID
      if (!bookmark.article_published_at && bookmark.article_id) {
        const timestampMatch = bookmark.article_id.match(/^.*-(\d+)-(\d{13})$/);
        if (timestampMatch) {
          // Extract timestamp from article ID format: "Source-Index-Timestamp"
          const timestamp = parseInt(timestampMatch[2]);
          if (!isNaN(timestamp)) {
            publishedAt = new Date(timestamp).toISOString();
            console.log(`📅 Extracted date from article ID ${bookmark.article_id}: ${publishedAt}`);
          }
        } else {
          // Try older format: "YYYYMMDD_HHMMSS_..."
          const oldTimestampMatch = bookmark.article_id.match(/^(\d{8})_(\d{6})/);
          if (oldTimestampMatch) {
            const [, dateStr, timeStr] = oldTimestampMatch;
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const hour = timeStr.substring(0, 2);
            const minute = timeStr.substring(2, 4);
            const second = timeStr.substring(4, 6);
            
            publishedAt = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
            console.log(`📅 Extracted date from old format article ID ${bookmark.article_id}: ${publishedAt}`);
          } else {
            // Fallback: use bookmark creation date minus random days (1-7 days)
            const createdAt = new Date(bookmark.created_at);
            const daysAgo = Math.floor(Math.random() * 7) + 1;
            const fallbackDate = new Date(createdAt.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            publishedAt = fallbackDate.toISOString();
            console.log(`📅 Using fallback date for ${bookmark.article_id}: ${publishedAt} (${daysAgo} days ago)`);
          }
        }
      }
      
      const publishedDate = new Date(publishedAt);
      const now = new Date();
      const publishedDaysAgo = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: bookmark.article_id,
        url: bookmark.article_url,
        title: bookmark.article_title,
        description: bookmark.summary || bookmark.article_title,
        source: bookmark.article_source,
        author: bookmark.author || '', // Use empty string instead of null
        publishedAt: publishedAt,
        content: bookmark.summary || '',
        articleIndex: 0,
        relevanceScore: bookmark.relevance_score || 0,
        qualityScore: 70,
        displayScore: bookmark.relevance_score || 70,
        isBookmarked: true,
        agNextTags: {
          isHighlyRelevant: (bookmark.relevance_score || 0) > 70,
          isRecentNews: publishedDaysAgo <= 7,
          hasIndiaFocus: false,
          hasAgNextKeywords: false,
          hasClientMention: false
        },
        agNextMetadata: {
          wordCount: bookmark.summary ? bookmark.summary.split(' ').length : 0,
          sourceReliability: 'medium' as const,
          publishedDaysAgo: publishedDaysAgo
        }
      };
    });
  }, []);

  // Enhanced bookmark refresh with optimistic updates
  const refreshBookmarkedArticles = useCallback(async () => {
    if (viewMode !== 'bookmarked') return;
    
    try {
      console.log('🔄 Refreshing bookmarked articles...');
      
      const response = await fetch('/api/bookmarks', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success && data.bookmarks) {
        const bookmarkedArticles = convertBookmarksToArticles(data.bookmarks);
        console.log('📋 Converting bookmarks to articles:', {
          bookmarkCount: data.bookmarks.length,
          articleIds: bookmarkedArticles.map(a => a.id),
          first3Articles: bookmarkedArticles.slice(0, 3).map(a => ({ id: a.id, title: a.title }))
        });
        
        setState(prev => ({ 
          ...prev, 
          bookmarkedArticles,
          bookmarkedCount: data.bookmarks.length,
        }));

        // ✨ SYNC DATABASE BOOKMARKS WITH IN-MEMORY STATE
        // This ensures isBookmarked() function recognizes these articles as bookmarked
        const bookmarkIds = data.bookmarks.map((bookmark: any) => bookmark.article_id);
        console.log('🔄 Syncing database bookmarks with in-memory state:', bookmarkIds);
        
        // Call refreshBookmarks to sync the useBookmarks hook state with database
        try {
          await refreshBookmarks();
          console.log('✅ useBookmarks hook state synced with database');
        } catch (refreshError) {
          console.error('❌ Failed to sync useBookmarks state:', refreshError);
          // Fallback: Update localStorage directly
          localStorage.setItem('agnext_bookmarks', JSON.stringify(bookmarkIds));
        }

        // Preload LinkedIn content for all bookmarked articles
        if (session?.sessionId && bookmarkedArticles.length > 0) {
          console.log('🔄 Preloading LinkedIn content for', bookmarkedArticles.length, 'articles...');
          fetchLinkedInContent(session.sessionId);
        }

        console.log('✅ Refreshed', data.bookmarks.length, 'bookmarked articles');
        console.log('📋 Article IDs that should be recognized as bookmarked:', bookmarkIds);
      } else {
        setState(prev => ({ 
          ...prev, 
          bookmarkedArticles: [],
          bookmarkedCount: 0,
        }));
      }
    } catch (error) {
      console.error('❌ Error refreshing bookmarked articles:', error);
    }
  }, [viewMode, convertBookmarksToArticles, session?.sessionId, fetchLinkedInContent, refreshBookmarks]);

  // Enhanced bookmark toggle with instant feedback
  const handleBookmarkToggle = useCallback(async (article: ProcessedArticle) => {
    console.log('🔖 Bookmark toggle requested for:', article.title);
    
    try {
      await toggleBookmark(article);
      
      // If we're in bookmark view and this was an unbookmark (no longer bookmarked), remove from display immediately
      if (viewMode === 'bookmarked' && !isBookmarked(article.id)) {
        setState(prev => ({
          ...prev,
          bookmarkedArticles: prev.bookmarkedArticles?.filter(a => a.id !== article.id) || []
        }));
      }
    } catch (error) {
      console.error('❌ Bookmark toggle failed:', error);
    }
  }, [toggleBookmark, viewMode, isBookmarked]);

  // Enhanced search handler that sets hasSearched flag
  const handleSearch = useCallback((query: string) => {
    setHasSearched(true);
    setViewMode('all'); // Switch to all articles view when searching
  }, []);

  // Filter and sort articles based on view mode
  const filteredArticles = useMemo(() => {
    let articles = viewMode === 'bookmarked' ? (state.bookmarkedArticles || []) : state.articles;
    
    // Apply sorting for bookmarked articles
    if (viewMode === 'bookmarked' && currentSort && articles.length > 0) {
      articles = [...articles]; // Create a copy to avoid mutating original array
      
      switch (currentSort) {
        case 'relevance':
          articles.sort((a, b) => b.displayScore - a.displayScore);
          break;
        case 'date':
          articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          break;
        case 'publisher':
          articles.sort((a, b) => a.source.localeCompare(b.source));
          break;
        case 'engagement':
          // Sort by engagement score from LinkedIn content
          articles.sort((a, b) => {
            const engagementA = getLinkedInContent(a.id)?.estimated_engagement_score || 0;
            const engagementB = getLinkedInContent(b.id)?.estimated_engagement_score || 0;
            return engagementB - engagementA;
          });
          break;
      }
    }
    
    return articles;
  }, [state.articles, state.bookmarkedArticles, viewMode, currentSort, getLinkedInContent]);

  // Determine sync status based on operations
  const getSyncStatus = useCallback(() => {
    if (optimisticOperations > 0) return 'syncing';
    if (syncLoading) return 'syncing';
    if (lastSyncTime) return 'success';
    return 'idle';
  }, [optimisticOperations, syncLoading, lastSyncTime]);

  // Fetch articles when hasSearched becomes true
  useEffect(() => {
    if (hasSearched && viewMode === 'all') {
      console.log('🔍 Search completed, fetching articles...');
      fetchArticles();
    }
  }, [hasSearched, viewMode, fetchArticles]);

  // Refetch when real-time update received
  useEffect(() => {
    if (lastUpdate && lastUpdate.type === 'new_articles' && hasSearched && state.articles.length === 0) {
      console.log('📡 Real-time update received - fetching articles');
      fetchArticles();
    }
  }, [lastUpdate, fetchArticles, hasSearched, state.articles.length]);

  // Fetch bookmarked articles when switching to bookmark view
  useEffect(() => {
    if (viewMode === 'bookmarked') {
      setState(prev => ({ ...prev, loading: true, error: null }));
      refreshBookmarkedArticles().finally(() => {
        setState(prev => ({ ...prev, loading: false }));
      });
    }
  }, [viewMode, refreshBookmarkedArticles]);

  // Initialize bookmark count when component mounts
  useEffect(() => {
    updateBookmarkCount();
  }, [updateBookmarkCount]);

  // Watch for bookmark changes and refresh if in bookmark view
  useEffect(() => {
    const currentBookmarkCount = getBookmarkCount();
    if (viewMode === 'bookmarked' && currentBookmarkCount !== previousBookmarkCount.current) {
      previousBookmarkCount.current = currentBookmarkCount;
      
      // Small delay to ensure server sync completes
      const timeoutId = setTimeout(() => {
        refreshBookmarkedArticles();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [getBookmarkCount(), viewMode, refreshBookmarkedArticles]);

  // Update bookmark count whenever bookmarks change (for all view modes)
  useEffect(() => {
    const currentBookmarkCount = getBookmarkCount();
    if (currentBookmarkCount !== previousBookmarkCount.current) {
      previousBookmarkCount.current = currentBookmarkCount;
      // Update the bookmark count in state regardless of view mode
      updateBookmarkCount();
    }
  }, [getBookmarkCount(), updateBookmarkCount]);

  // Now we can do conditional rendering after all hooks are called
  if (sessionLoading) {
    return <LoadingGrid />;
  }

  // Show authentication required if not authenticated
  if (!isAuthenticated || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Authentication Required</h2>
                        <p className="text-slate-600">Please log in to access News Intelligence.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <SearchHeader
        onNewArticles={handleNewArticlesNotification}
        onSearchComplete={handleSearch}
        onShowBookmarks={() => setViewMode('bookmarked')}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Toggle and Controls */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {/* View Mode Toggle - Centered */}
          <div className="flex items-center bg-white/70 backdrop-blur-sm rounded-2xl p-1 border border-white/50 shadow-sm">
            <button
              onClick={() => setViewMode('all')}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                viewMode === 'all'
                  ? 'bg-white shadow-sm text-blue-700 border border-blue-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Articles
              {state.searchResultsCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {state.searchResultsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('bookmarked')}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                viewMode === 'bookmarked'
                  ? 'bg-white shadow-sm text-red-700 border border-red-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Bookmarks
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                {state.bookmarkedCount || 0}
              </span>
            </button>
          </div>

          {/* Sort Dropdown - Show for search results or bookmarks */}
          {((viewMode === 'all' && hasSearched) || (viewMode === 'bookmarked' && filteredArticles.length > 0)) && (
            <SortDropdown
              currentSort={currentSort}
              onSortChange={handleSortChange}
            />
          )}
        </div>

        {/* Content Area */}
        {viewMode === 'all' && !hasSearched ? (
          // Welcome state
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome to News Intelligence</h2>
              <p className="text-slate-600 leading-relaxed">
                Search for agriculture technology, food quality, and news with our AI-powered system. Enter keywords above to get started.
              </p>
            </div>
          </div>
        ) : state.loading ? (
          <LoadingGrid />
        ) : state.error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Articles</h3>
            <p className="text-slate-600 mb-4">{state.error}</p>
            <button
              onClick={() => fetchArticles()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {viewMode === 'bookmarked' ? 'No Bookmarked Articles' : 'No Articles Found'}
            </h3>
            <p className="text-slate-600">
              {viewMode === 'bookmarked' 
                ? 'Start bookmarking articles to see them here.' 
                : 'Try adjusting your search terms or check back later for new content.'
              }
            </p>
          </div>
        ) : (
          // Article grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => {
              // In bookmarked view, all articles are bookmarked by definition
              const articleIsBookmarked = viewMode === 'bookmarked' ? true : isBookmarked(article.id);
              
              return (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isBookmarked={articleIsBookmarked}
                  onBookmarkToggle={handleBookmarkToggle}
                  bookmarkLoading={optimisticOperations > 0}
                  sessionId={session.sessionId}
                  showLinkedInButton={articleIsBookmarked}
                />
              );
            })}
          </div>
        )}

        {/* Footer/Status Info */}
        {state.lastUpdated && (
          <div className="mt-12 text-center text-sm text-slate-500">
            <p>Last updated: {new Date(state.lastUpdated).toLocaleString()}</p>
            {getSyncStatus() === 'syncing' && (
              <p className="mt-1 text-blue-600">
                <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></span>
                Syncing bookmarks...
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 