import { supabase } from './supabase';
import type { Tables } from './supabase';
import type { ProcessedArticle } from '@/types/article';

type Bookmark = Tables<'bookmarks'>;

export interface BookmarkData {
  id: string;
  sessionId: string;
  articleId: string;
  articleUrl: string;
  articleTitle: string;
  articleSource: string;
  createdAt: string;
}

// Add bookmark to Supabase
export async function addBookmark(
  sessionId: string,
  article: ProcessedArticle
): Promise<BookmarkData | null> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        session_id: sessionId,
        article_id: article.id,
        article_url: article.url,
        article_title: article.title,
        article_source: article.source,
        article_published_at: article.publishedAt
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate bookmark error
      if (error.code === '23505') {
        console.log(`📌 Bookmark already exists for article ${article.id}`);
        return null;
      }
      console.error('Error adding bookmark:', error);
      return null;
    }

    console.log(`📌 Bookmark added: ${article.title} (${article.id})`);

    return {
      id: data.id,
      sessionId: data.session_id,
      articleId: data.article_id,
      articleUrl: data.article_url,
      articleTitle: data.article_title,
      articleSource: data.article_source,
      createdAt: data.created_at
    };

  } catch (error) {
    console.error('Error in addBookmark:', error);
    return null;
  }
}

// Remove bookmark from Supabase
export async function removeBookmark(
  sessionId: string,
  articleId: string
): Promise<boolean> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('session_id', sessionId)
      .eq('article_id', articleId);

    if (error) {
      console.error('Error removing bookmark:', error);
      return false;
    }

    console.log(`🗑️ Bookmark removed for article: ${articleId}`);
    return true;

  } catch (error) {
    console.error('Error in removeBookmark:', error);
    return false;
  }
}

// Get all bookmarks for a session
export async function getBookmarks(sessionId: string): Promise<BookmarkData[]> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }

    return data.map(bookmark => ({
      id: bookmark.id,
      sessionId: bookmark.session_id,
      articleId: bookmark.article_id,
      articleUrl: bookmark.article_url,
      articleTitle: bookmark.article_title,
      articleSource: bookmark.article_source,
      createdAt: bookmark.created_at
    }));

  } catch (error) {
    console.error('Error in getBookmarks:', error);
    return [];
  }
}

// Get bookmark count for a session
export async function getBookmarkCount(sessionId: string): Promise<number> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error counting bookmarks:', error);
      return 0;
    }

    return count || 0;

  } catch (error) {
    console.error('Error in getBookmarkCount:', error);
    return 0;
  }
}

// Check if an article is bookmarked
export async function isBookmarked(
  sessionId: string,
  articleId: string
): Promise<boolean> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('session_id', sessionId)
      .eq('article_id', articleId)
      .single();

    if (error) {
      // Not found is not an error for this check
      return false;
    }

    return !!data;

  } catch (error) {
    console.error('Error in isBookmarked:', error);
    return false;
  }
}

// Get bookmarked article IDs for a session (for filtering)
export async function getBookmarkedArticleIds(sessionId: string): Promise<string[]> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .select('article_id')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error fetching bookmarked article IDs:', error);
      return [];
    }

    return data.map(bookmark => bookmark.article_id);

  } catch (error) {
    console.error('Error in getBookmarkedArticleIds:', error);
    return [];
  }
}

// Clear all bookmarks for a session
export async function clearAllBookmarks(sessionId: string): Promise<number> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('session_id', sessionId)
      .select('id');

    if (error) {
      console.error('Error clearing bookmarks:', error);
      return 0;
    }

    const clearedCount = data?.length || 0;
    console.log(`🗑️ Cleared ${clearedCount} bookmarks for session: ${sessionId}`);
    return clearedCount;

  } catch (error) {
    console.error('Error in clearAllBookmarks:', error);
    return 0;
  }
}

// Sync bookmarks between localStorage and Supabase (for backward compatibility)
export async function syncBookmarks(
  sessionId: string,
  localBookmarks: string[]
): Promise<{
  added: number;
  skipped: number;
  errors: number;
}> {
  let added = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Get existing bookmarks from Supabase
    const existingBookmarks = await getBookmarkedArticleIds(sessionId);
    
    // Process each local bookmark
    for (const articleId of localBookmarks) {
      if (existingBookmarks.includes(articleId)) {
        skipped++;
        continue;
      }

      try {
        // For sync, we need minimal article data
        // In a real implementation, you might want to fetch full article data
        const minimalArticle: ProcessedArticle = {
          id: articleId,
          title: 'Synced Bookmark',
          url: '',
          source: 'Unknown',
          description: '',
          author: '',
          publishedAt: new Date().toISOString(),
          content: '',
          articleIndex: 0,
          relevanceScore: 0,
          qualityScore: 0,
          displayScore: 0,
          isBookmarked: true,
          agNextTags: {
            isHighlyRelevant: false,
            isRecentNews: false,
            hasIndiaFocus: false,
            hasAgNextKeywords: false,
            hasClientMention: false,
          },
          agNextMetadata: {
            wordCount: 0,
            sourceReliability: 'unknown',
            publishedDaysAgo: 0
          }
        };

        const result = await addBookmark(sessionId, minimalArticle);
        if (result) {
          added++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`Error syncing bookmark ${articleId}:`, error);
        errors++;
      }
    }

    console.log(`🔄 Bookmark sync completed: ${added} added, ${skipped} skipped, ${errors} errors`);
    return { added, skipped, errors };

  } catch (error) {
    console.error('Error in syncBookmarks:', error);
    return { added, skipped, errors };
  }
}

// Get bookmark statistics for analytics
export async function getBookmarkStats(sessionId: string): Promise<{
  totalBookmarks: number;
  recentBookmarks: number;
  topSources: { source: string; count: number }[];
  oldestBookmark: string | null;
  newestBookmark: string | null;
}> {
  try {
    // Set session context for RLS
    await supabase.rpc('set_config', {
      setting_name: 'app.current_session_id',
      setting_value: sessionId,
      is_local: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .select('article_source, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmark stats:', error);
      return {
        totalBookmarks: 0,
        recentBookmarks: 0,
        topSources: [],
        oldestBookmark: null,
        newestBookmark: null
      };
    }

    const totalBookmarks = data.length;
    
    // Recent bookmarks (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentBookmarks = data.filter(
      bookmark => new Date(bookmark.created_at) > weekAgo
    ).length;

    // Top sources
    const sourceCounts: Record<string, number> = {};
    data.forEach(bookmark => {
      sourceCounts[bookmark.article_source] = (sourceCounts[bookmark.article_source] || 0) + 1;
    });
    
    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Oldest and newest
    const sortedByDate = [...data].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const oldestBookmark = sortedByDate[0]?.created_at || null;
    const newestBookmark = sortedByDate[sortedByDate.length - 1]?.created_at || null;

    return {
      totalBookmarks,
      recentBookmarks,
      topSources,
      oldestBookmark,
      newestBookmark
    };

  } catch (error) {
    console.error('Error in getBookmarkStats:', error);
    return {
      totalBookmarks: 0,
      recentBookmarks: 0,
      topSources: [],
      oldestBookmark: null,
      newestBookmark: null
    };
  }
} 