/**
 * Enhanced Bookmark System with Supabase Backend + Webhook Integration
 * Features:
 * - Supabase backend for persistent storage
 * - Webhook triggers for data generation
 * - Loading states and real-time updates
 * - Rich analytics and metadata
 */

import { supabase } from './supabase';
import type { ProcessedArticle } from '@/types/article';

// Check if Supabase is available
let isSupabaseAvailable = false;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  isSupabaseAvailable = !!(supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co');
  console.log('📊 Supabase availability:', isSupabaseAvailable ? 'Available' : 'Not configured');
} catch (error) {
  console.log('📊 Supabase check failed, using fallback');
  isSupabaseAvailable = false;
}

// Fallback storage when Supabase isn't available
let fallbackBookmarks: EnhancedBookmark[] = [];

export interface EnhancedBookmark {
  id: string;
  session_id: string;
  article_id: string;
  article_url: string;
  article_title: string;
  article_source: string;
  created_at: string;
  // Enhanced fields
  summary?: string;
  tags?: string[];
  relevance_score?: number;
  webhook_processed?: boolean;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  enriched_data?: {
    key_insights?: string[];
    related_topics?: string[];
    industry_impact?: string;
    market_analysis?: string;
  };
}

export interface BookmarkWebhookData {
  bookmarks: EnhancedBookmark[];
  session_id: string;
  total_count: number;
  processing_stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

/**
 * Add a bookmark with automatic webhook trigger for data enrichment
 */
export async function addEnhancedBookmark(
  sessionId: string, 
  article: ProcessedArticle
): Promise<{ success: boolean; bookmark?: EnhancedBookmark; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      // Fallback storage
      const bookmark: EnhancedBookmark = {
        id: `fallback-${Date.now()}`,
        session_id: sessionId,
        article_id: article.url,
        article_url: article.url,
        article_title: article.title,
        article_source: article.source,
        created_at: new Date().toISOString(),
        processing_status: 'pending'
      };
      fallbackBookmarks.push(bookmark);
      
      // Trigger webhook for data enrichment
      triggerBookmarkWebhook(sessionId, [bookmark]);
      
      return { success: true, bookmark };
    }

    // Ensure session exists
    await ensureSession(sessionId);

    const bookmarkData = {
      session_id: sessionId,
      article_id: article.url,
      article_url: article.url,
      article_title: article.title,
      article_source: article.source,
      processing_status: 'pending',
      webhook_processed: false
    };

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([bookmarkData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already exists, get existing bookmark
        const { data: existing } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('session_id', sessionId)
          .eq('article_id', article.url)
          .single();
        
        return { success: true, bookmark: existing };
      }
      return { success: false, error: error.message };
    }

    const bookmark: EnhancedBookmark = {
      id: data.id,
      session_id: data.session_id,
      article_id: data.article_id,
      article_url: data.article_url,
      article_title: data.article_title,
      article_source: data.article_source,
      created_at: data.created_at,
      processing_status: 'pending',
      webhook_processed: false
    };

    // Trigger webhook for immediate data enrichment
    triggerBookmarkWebhook(sessionId, [bookmark]);

    console.log('✅ Enhanced bookmark added:', article.title);
    return { success: true, bookmark };

  } catch (error) {
    console.error('Error in addEnhancedBookmark:', error);
    return { success: false, error: 'Failed to add bookmark' };
  }
}

/**
 * Get all bookmarks with loading states and trigger webhook if needed
 */
export async function getEnhancedBookmarks(
  sessionId: string,
  triggerWebhook: boolean = true
): Promise<{ success: boolean; data?: BookmarkWebhookData; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      const data: BookmarkWebhookData = {
        bookmarks: [...fallbackBookmarks],
        session_id: sessionId,
        total_count: fallbackBookmarks.length,
        processing_stats: calculateProcessingStats(fallbackBookmarks)
      };
      
      if (triggerWebhook && fallbackBookmarks.length > 0) {
        triggerBookmarkWebhook(sessionId, fallbackBookmarks);
      }
      
      return { success: true, data };
    }

    // Get bookmarks from Supabase
    const { data: bookmarks, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const enhancedBookmarks: EnhancedBookmark[] = bookmarks.map(bookmark => ({
      id: bookmark.id,
      session_id: bookmark.session_id,
      article_id: bookmark.article_id,
      article_url: bookmark.article_url,
      article_title: bookmark.article_title,
      article_source: bookmark.article_source,
      created_at: bookmark.created_at,
      processing_status: bookmark.processing_status || 'pending',
      webhook_processed: bookmark.webhook_processed || false,
      summary: bookmark.summary || undefined,
      tags: bookmark.tags ? JSON.parse(bookmark.tags) : undefined,
      relevance_score: bookmark.relevance_score || undefined,
      enriched_data: bookmark.enriched_data ? JSON.parse(bookmark.enriched_data) : undefined
    }));

    const data: BookmarkWebhookData = {
      bookmarks: enhancedBookmarks,
      session_id: sessionId,
      total_count: enhancedBookmarks.length,
      processing_stats: calculateProcessingStats(enhancedBookmarks)
    };

    // Trigger webhook if there are unprocessed bookmarks
    const unprocessedBookmarks = enhancedBookmarks.filter(
      b => !b.webhook_processed || b.processing_status === 'pending'
    );

    if (triggerWebhook && unprocessedBookmarks.length > 0) {
      console.log(`🔄 Triggering webhook for ${unprocessedBookmarks.length} unprocessed bookmarks`);
      triggerBookmarkWebhook(sessionId, unprocessedBookmarks);
    }

    return { success: true, data };

  } catch (error) {
    console.error('Error in getEnhancedBookmarks:', error);
    return { success: false, error: 'Failed to fetch bookmarks' };
  }
}

/**
 * Remove a bookmark
 */
export async function removeEnhancedBookmark(
  sessionId: string, 
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      const index = fallbackBookmarks.findIndex(b => b.article_id === articleId);
      if (index > -1) {
        fallbackBookmarks.splice(index, 1);
      }
      return { success: true };
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('session_id', sessionId)
      .eq('article_id', articleId);

    if (error) {
      return { success: false, error: error.message };
    }

    console.log('🗑️ Enhanced bookmark removed:', articleId);
    return { success: true };

  } catch (error) {
    console.error('Error in removeEnhancedBookmark:', error);
    return { success: false, error: 'Failed to remove bookmark' };
  }
}

/**
 * Update bookmark with enriched data from webhook
 */
export async function updateBookmarkWithEnrichedData(
  bookmarkId: string,
  enrichedData: {
    summary?: string;
    tags?: string[];
    relevance_score?: number;
    enriched_data?: EnhancedBookmark['enriched_data'];
    processing_status: EnhancedBookmark['processing_status'];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isSupabaseAvailable) {
      const bookmark = fallbackBookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        Object.assign(bookmark, {
          ...enrichedData,
          webhook_processed: true,
          tags: enrichedData.tags,
          enriched_data: enrichedData.enriched_data
        });
      }
      return { success: true };
    }

    const updateData: any = {
      ...enrichedData,
      webhook_processed: true,
      tags: enrichedData.tags ? JSON.stringify(enrichedData.tags) : null,
      enriched_data: enrichedData.enriched_data ? JSON.stringify(enrichedData.enriched_data) : null
    };

    const { error } = await supabase
      .from('bookmarks')
      .update(updateData)
      .eq('id', bookmarkId);

    if (error) {
      return { success: false, error: error.message };
    }

    console.log('✅ Bookmark updated with enriched data:', bookmarkId);
    return { success: true };

  } catch (error) {
    console.error('Error in updateBookmarkWithEnrichedData:', error);
    return { success: false, error: 'Failed to update bookmark' };
  }
}

/**
 * Trigger webhook for bookmark data generation
 */
async function triggerBookmarkWebhook(
  sessionId: string, 
  bookmarks: EnhancedBookmark[]
): Promise<void> {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_BOOKMARK_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl === 'http://127.0.0.1:5678/webhook/bookmark-data') {
      console.log('📡 Bookmark webhook URL not configured, skipping webhook trigger');
      return;
    }

    // Mark bookmarks as processing
    for (const bookmark of bookmarks) {
      if (isSupabaseAvailable) {
        await supabase
          .from('bookmarks')
          .update({ processing_status: 'processing' })
          .eq('id', bookmark.id);
      } else {
        bookmark.processing_status = 'processing';
      }
    }

    const payload = {
      session_id: sessionId,
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        article_id: b.article_id,
        article_url: b.article_url,
        article_title: b.article_title,
        article_source: b.article_source,
        created_at: b.created_at
      })),
      action: 'enrich_bookmarks',
      timestamp: new Date().toISOString()
    };

    console.log('📡 Triggering bookmark webhook:', webhookUrl);
    
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(error => {
      console.error('Webhook trigger failed:', error);
      // Mark bookmarks as failed if webhook fails
      bookmarks.forEach(bookmark => {
        bookmark.processing_status = 'failed';
      });
    });

  } catch (error) {
    console.error('Error triggering bookmark webhook:', error);
  }
}

/**
 * Calculate processing statistics
 */
function calculateProcessingStats(bookmarks: EnhancedBookmark[]) {
  return bookmarks.reduce(
    (stats, bookmark) => {
      const status = bookmark.processing_status || 'pending';
      stats[status]++;
      return stats;
    },
    { pending: 0, processing: 0, completed: 0, failed: 0 }
  );
}

/**
 * Ensure session exists in Supabase
 */
async function ensureSession(sessionId: string): Promise<void> {
  if (!isSupabaseAvailable) return;

  try {
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!existingSession) {
      await supabase
        .from('sessions')
        .insert([{
          session_id: sessionId,
          ip_address: '127.0.0.1' // Default for development
        }]);
    }
  } catch (error) {
    console.error('Error ensuring session:', error);
  }
}

/**
 * Get bookmark analytics
 */
export async function getBookmarkAnalytics(sessionId: string): Promise<{
  totalBookmarks: number;
  processedBookmarks: number;
  averageProcessingTime: number;
  topSources: { source: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}> {
  try {
    if (!isSupabaseAvailable) {
      return {
        totalBookmarks: fallbackBookmarks.length,
        processedBookmarks: fallbackBookmarks.filter(b => b.webhook_processed).length,
        averageProcessingTime: 0,
        topSources: [],
        recentActivity: []
      };
    }

    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', sessionId);

    if (!bookmarks) {
      return {
        totalBookmarks: 0,
        processedBookmarks: 0,
        averageProcessingTime: 0,
        topSources: [],
        recentActivity: []
      };
    }

    const totalBookmarks = bookmarks.length;
    const processedBookmarks = bookmarks.filter(b => b.webhook_processed).length;

    // Calculate top sources
    const sourceCounts: Record<string, number> = {};
    bookmarks.forEach(bookmark => {
      sourceCounts[bookmark.article_source] = (sourceCounts[bookmark.article_source] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate recent activity (last 7 days)
    const recentActivity: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = bookmarks.filter(bookmark => 
        bookmark.created_at.startsWith(dateStr)
      ).length;
      
      recentActivity.push({ date: dateStr, count });
    }

    return {
      totalBookmarks,
      processedBookmarks,
      averageProcessingTime: 2500, // Estimated average processing time in ms
      topSources,
      recentActivity
    };

  } catch (error) {
    console.error('Error getting bookmark analytics:', error);
    return {
      totalBookmarks: 0,
      processedBookmarks: 0,
      averageProcessingTime: 0,
      topSources: [],
      recentActivity: []
    };
  }
} 