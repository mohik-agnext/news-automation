/**
 * Shared Bookmarks System
 * All users see the same bookmarks - perfect for small teams (2-5 people)
 */

import type { ProcessedArticle } from '@/types/article';

// Check if Supabase is available
let supabase: any = null;
let isSupabaseAvailable = false;

try {
  const { supabase: supabaseClient } = require('./supabase');
  supabase = supabaseClient;
  isSupabaseAvailable = true;
  console.log('📊 Supabase bookmarks available');
} catch (error) {
  console.log('📊 Supabase not configured, using fallback bookmarks');
  isSupabaseAvailable = false;
}

// Fallback in-memory storage when Supabase isn't available
let fallbackBookmarks: SharedBookmark[] = [];

// Use a shared session ID for all users
const SHARED_SESSION_ID = 'shared-team-bookmarks';

export interface SharedBookmark {
  id: string;
  session_id: string;
  article_id: string;
  article_url: string;
  article_title: string;
  article_source: string;
  created_at: string;
}

/**
 * Add a bookmark to the shared collection
 */
export async function addSharedBookmark(article: ProcessedArticle): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      // Use fallback storage
      const existingIndex = fallbackBookmarks.findIndex(b => b.article_id === article.url);
      if (existingIndex === -1) {
        fallbackBookmarks.push({
          id: `fallback-${Date.now()}`,
          session_id: SHARED_SESSION_ID,
          article_id: article.url,
          article_url: article.url,
          article_title: article.title,
          article_source: article.source,
          created_at: new Date().toISOString()
        });
        console.log('✅ Added fallback bookmark:', article.title);
      }
      return { success: true };
    }

    // First ensure we have a shared session
    await ensureSharedSession();

    const bookmarkData = {
      session_id: SHARED_SESSION_ID,
      article_id: article.url, // Use URL as unique identifier
      article_url: article.url,
      article_title: article.title,
      article_source: article.source
    };

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([bookmarkData])
      .select()
      .single();

    if (error) {
      // If it's a duplicate, that's fine
      if (error.code === '23505') {
        return { success: true };
      }
      console.error('Error adding shared bookmark:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Added shared bookmark:', article.title);
    return { success: true };
  } catch (error) {
    console.error('Error in addSharedBookmark:', error);
    return { success: false, error: 'Failed to add bookmark' };
  }
}

/**
 * Remove a bookmark from the shared collection
 */
export async function removeSharedBookmark(articleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      // Use fallback storage
      const index = fallbackBookmarks.findIndex(b => b.article_id === articleId);
      if (index !== -1) {
        fallbackBookmarks.splice(index, 1);
        console.log('🗑️ Removed fallback bookmark:', articleId);
      }
      return { success: true };
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('session_id', SHARED_SESSION_ID)
      .eq('article_id', articleId);

    if (error) {
      console.error('Error removing shared bookmark:', error);
      return { success: false, error: error.message };
    }

    console.log('🗑️ Removed shared bookmark:', articleId);
    return { success: true };
  } catch (error) {
    console.error('Error in removeSharedBookmark:', error);
    return { success: false, error: 'Failed to remove bookmark' };
  }
}

/**
 * Get all shared bookmarks
 */
export async function getSharedBookmarks(): Promise<{ success: boolean; bookmarks: SharedBookmark[]; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      return { success: true, bookmarks: [...fallbackBookmarks].reverse() };
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', SHARED_SESSION_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared bookmarks:', error);
      return { success: false, bookmarks: [], error: error.message };
    }

    return { success: true, bookmarks: data || [] };
  } catch (error) {
    console.error('Error in getSharedBookmarks:', error);
    return { success: false, bookmarks: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check if an article is bookmarked by anyone
 */
export async function isSharedBookmarked(articleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('session_id', SHARED_SESSION_ID)
      .eq('article_id', articleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking shared bookmark:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isSharedBookmarked:', error);
    return false;
  }
}

/**
 * Get count of shared bookmarks
 */
export async function getSharedBookmarkCount(): Promise<number> {
  try {
    if (!isSupabaseAvailable) {
      return fallbackBookmarks.length;
    }

    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', SHARED_SESSION_ID);

    if (error) {
      console.error('Error getting shared bookmark count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getSharedBookmarkCount:', error);
    return 0;
  }
}

/**
 * Get all bookmarked article IDs for filtering
 */
export async function getSharedBookmarkedArticleIds(): Promise<string[]> {
  try {
    if (!isSupabaseAvailable) {
      return fallbackBookmarks.map(bookmark => bookmark.article_id);
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('article_id')
      .eq('session_id', SHARED_SESSION_ID);

    if (error) {
      console.error('Error fetching shared bookmark IDs:', error);
      return [];
    }

    return data?.map((bookmark: { article_id: string }) => bookmark.article_id) || [];
  } catch (error) {
    console.error('Error in getSharedBookmarkedArticleIds:', error);
    return [];
  }
}

/**
 * Clear all shared bookmarks
 */
export async function clearAllSharedBookmarks(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('session_id', SHARED_SESSION_ID);

    if (error) {
      console.error('Error clearing shared bookmarks:', error);
      return { success: false, error: error.message };
    }

    console.log('🗑️ Cleared all shared bookmarks');
    return { success: true };
  } catch (error) {
    console.error('Error in clearAllSharedBookmarks:', error);
    return { success: false, error: 'Failed to clear bookmarks' };
  }
}

/**
 * Ensure the shared session exists
 */
async function ensureSharedSession(): Promise<void> {
  try {
    // Check if shared session exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_id', SHARED_SESSION_ID)
      .single();

    if (!existingSession) {
      // Create shared session
      const { error: insertError } = await supabase
        .from('sessions')
        .insert([{
          session_id: SHARED_SESSION_ID,
          ip_address: '0.0.0.0'  // Shared session marker
        }]);

      if (insertError && insertError.code !== '23505') {
        console.error('Error creating shared session:', insertError);
      } else {
        console.log('✅ Created shared session for team bookmarks');
      }
    }
  } catch (error) {
    console.error('Error in ensureSharedSession:', error);
  }
}

/**
 * Get all shared bookmarked articles with full article content
 */
export async function getSharedBookmarkedArticles(): Promise<{ success: boolean; articles: any[]; error?: string }> {
  try {
    // Get all shared bookmarks
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', SHARED_SESSION_ID)
      .order('created_at', { ascending: false });

    if (bookmarksError) {
      console.error('Error fetching shared bookmarks:', bookmarksError);
      return { success: false, articles: [], error: bookmarksError.message };
    }

    if (!bookmarks || bookmarks.length === 0) {
      return { success: true, articles: [] };
    }

    // Convert bookmarks to article format
    const articles = bookmarks.map((bookmark: SharedBookmark) => ({
      id: bookmark.article_id || bookmark.article_url,
      title: bookmark.article_title,
      url: bookmark.article_url,
      source: bookmark.article_source,
      publishedAt: bookmark.created_at,
      description: `Bookmarked article from ${bookmark.article_source}`,
      content: '',
      articleIndex: 0,
      relevanceScore: 5, // Give bookmarked articles high relevance
      qualityScore: 5,
      displayScore: 50,
      isBookmarked: true,
      agNextMetadata: {
        wordCount: 0,
        sourceReliability: 'unknown',
        publishedDaysAgo: Math.floor((Date.now() - new Date(bookmark.created_at).getTime()) / (1000 * 60 * 60 * 24))
      },
      agNextTags: {
        isHighlyRelevant: true,
        isRecentNews: true,
        hasIndiaFocus: true,
        hasAgNextKeywords: true,
        hasClientMention: false
      }
    }));

    return { success: true, articles };

  } catch (error) {
    console.error('Error in getSharedBookmarkedArticles:', error);
    return { success: false, articles: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 