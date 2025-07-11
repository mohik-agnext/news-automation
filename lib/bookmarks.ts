import { ProcessedArticle } from '@/types/article';
import { supabase, BookmarkRow, BookmarkInsert, SessionInsert, isSupabaseConfigured } from './supabase';
import { LocalStorageBookmarks } from '@/types/session';

const BOOKMARKS_STORAGE_KEY = 'agnext-news-bookmarks';

// Legacy localStorage functions for fallback
export function getLocalStorageBookmarks(): LocalStorageBookmarks {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading bookmarks from localStorage:', error);
    return {};
  }
}

export function setLocalStorageBookmarks(bookmarks: LocalStorageBookmarks): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Error saving bookmarks to localStorage:', error);
  }
}

// Supabase bookmark functions
export async function ensureSession(sessionId: string, ipAddress: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('sessions')
    .upsert({
      session_id: sessionId,
      ip_address: ipAddress,
      last_accessed: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  if (error) {
    console.error('Error ensuring session:', error);
  }
}

export async function addBookmarkToSupabase(
  sessionId: string, 
  article: ProcessedArticle,
  ipAddress: string = '127.0.0.1'
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage
    addBookmarkToLocalStorage(article);
    return true;
  }

  try {
    // Ensure session exists
    await ensureSession(sessionId, ipAddress);

    // Insert bookmark
    const bookmarkData: BookmarkInsert = {
      session_id: sessionId,
      article_id: article.id,
      article_url: article.url,
      article_title: article.title,
      article_source: article.source || 'Unknown',
      article_published_at: article.publishedAt,
      processing_status: 'pending',
      webhook_processed: false
    };

    const { error } = await supabase
      .from('bookmarks')
      .insert(bookmarkData);

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - bookmark already exists
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error adding bookmark to Supabase:', error);
    // Fallback to localStorage
    addBookmarkToLocalStorage(article);
    return true;
  }
}

export async function removeBookmarkFromSupabase(sessionId: string, articleId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage
    removeBookmarkFromLocalStorage(articleId);
    return true;
  }

  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('session_id', sessionId)
      .eq('article_id', articleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing bookmark from Supabase:', error);
    // Fallback to localStorage
    removeBookmarkFromLocalStorage(articleId);
    return true;
  }
}

export async function getBookmarksFromSupabase(sessionId: string): Promise<BookmarkRow[]> {
  if (!isSupabaseConfigured()) {
    // Return empty array for consistent API
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching bookmarks from Supabase:', error);
    return [];
  }
}

export async function isBookmarkedInSupabase(sessionId: string, articleId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage
    return isBookmarkedInLocalStorage(articleId);
  }

  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('session_id', sessionId)
      .eq('article_id', articleId)
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    // Fallback to localStorage
    return isBookmarkedInLocalStorage(articleId);
  }
}

// Legacy localStorage functions (kept for fallback)
export function addBookmarkToLocalStorage(article: ProcessedArticle): void {
  const bookmarks = getLocalStorageBookmarks();
  bookmarks[article.id] = {
    bookmarkedAt: new Date().toISOString(),
    title: article.title,
    url: article.url
  };
  setLocalStorageBookmarks(bookmarks);
}

export function removeBookmarkFromLocalStorage(articleId: string): void {
  const bookmarks = getLocalStorageBookmarks();
  delete bookmarks[articleId];
  setLocalStorageBookmarks(bookmarks);
}

export function isBookmarkedInLocalStorage(articleId: string): boolean {
  const bookmarks = getLocalStorageBookmarks();
  return articleId in bookmarks;
}

// Enhanced bookmark functions
export async function updateBookmarkProcessingStatus(
  sessionId: string, 
  articleId: string, 
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('bookmarks')
      .update({ 
        processing_status: status,
        webhook_processed: status === 'completed'
      })
      .eq('session_id', sessionId)
      .eq('article_id', articleId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating bookmark processing status:', error);
  }
}

export async function enrichBookmark(
  sessionId: string, 
  articleId: string, 
  enrichmentData: {
    summary?: string;
    tags?: string[];
    relevanceScore?: number;
    enrichedData?: any;
  }
): Promise<void> {
  console.log('🔧 enrichBookmark called with:', { sessionId, articleId, enrichmentData });
  
  if (!isSupabaseConfigured()) {
    console.log('❌ Supabase not configured, skipping enrichment');
    return;
  }

  try {
    console.log('📝 About to update bookmark with data:', {
      summary: enrichmentData.summary,
      tags: enrichmentData.tags ? JSON.stringify(enrichmentData.tags) : null,
      relevance_score: enrichmentData.relevanceScore,
      enriched_data: enrichmentData.enrichedData ? JSON.stringify(enrichmentData.enrichedData) : null,
      processing_status: 'completed',
      webhook_processed: true
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .update({ 
        summary: enrichmentData.summary,
        tags: enrichmentData.tags ? JSON.stringify(enrichmentData.tags) : null,
        relevance_score: enrichmentData.relevanceScore,
        enriched_data: enrichmentData.enrichedData ? JSON.stringify(enrichmentData.enrichedData) : null,
        processing_status: 'completed',
        webhook_processed: true
      })
      .eq('session_id', sessionId)
      .eq('article_id', articleId)
      .select(); // Add select to get updated data

    console.log('📊 Supabase update result:', { data, error });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    if (data && data.length === 0) {
      console.warn('⚠️ No rows updated - bookmark not found?');
    } else {
      console.log('✅ Bookmark enriched successfully, updated rows:', data?.length);
    }
  } catch (error) {
    console.error('❌ Error enriching bookmark:', error);
    throw error;
  }
}

// Migration and sync functions
export function syncBookmarksWithServer(sessionId: string, bookmarks: LocalStorageBookmarks): Promise<void> {
  return fetch('/api/bookmarks/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      sessionId,
      bookmarks: Object.keys(bookmarks)
    })
  }).then(response => {
    if (!response.ok) {
      throw new Error('Failed to sync bookmarks with server');
    }
  }).catch(error => {
    console.error('Error syncing bookmarks:', error);
  });
}

export function mergeBookmarks(localBookmarks: LocalStorageBookmarks, serverBookmarks: string[]): string[] {
  const localIds = Object.keys(localBookmarks);
  const allBookmarks = new Set([...localIds, ...serverBookmarks]);
  return Array.from(allBookmarks);
}

export function clearAllBookmarks(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  }
}

export function exportBookmarks(): LocalStorageBookmarks {
  return getLocalStorageBookmarks();
}

export function importBookmarks(bookmarks: LocalStorageBookmarks): void {
  setLocalStorageBookmarks(bookmarks);
} 