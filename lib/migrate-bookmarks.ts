/**
 * Migration Helper for Bookmarks
 * Helps transition from localStorage-only bookmarks to Supabase-backed bookmarks
 */

import { getLocalStorageBookmarks } from './bookmarks';
import type { ProcessedArticle } from '@/types/article';

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: number;
  message: string;
}

/**
 * Migrate localStorage bookmarks to Supabase
 * This function should be called once when switching to Supabase
 */
export async function migrateLocalBookmarksToSupabase(): Promise<MigrationResult> {
  try {
    // Get all localStorage bookmarks
    const localBookmarks = getLocalStorageBookmarks();
    const bookmarkIds = Object.keys(localBookmarks);
    
    if (bookmarkIds.length === 0) {
      return {
        success: true,
        migrated: 0,
        skipped: 0,
        errors: 0,
        message: 'No localStorage bookmarks found to migrate'
      };
    }

    console.log(`🔄 Starting migration of ${bookmarkIds.length} localStorage bookmarks to Supabase...`);

    // Convert localStorage format to ProcessedArticle format
    const articlesToMigrate: ProcessedArticle[] = bookmarkIds.map(id => {
      const bookmark = localBookmarks[id];
      return {
        id,
        title: bookmark.title || 'Untitled Article',
        url: bookmark.url || '',
        source: 'Imported from localStorage',
        description: 'Imported bookmark from localStorage',
        author: 'Unknown',
        publishedAt: bookmark.bookmarkedAt || new Date().toISOString(),
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
    });

    // Send to sync endpoint
    const response = await fetch('/api/bookmarks/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        bookmarks: articlesToMigrate
      })
    });

    if (!response.ok) {
      throw new Error(`Migration failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`✅ Migration completed: ${result.synced} synced, ${result.skipped} skipped`);
    
    return {
      success: true,
      migrated: result.synced,
      skipped: result.skipped,
      errors: 0,
      message: `Successfully migrated ${result.synced} bookmarks to Supabase`
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      migrated: 0,
      skipped: 0,
      errors: 1,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if migration is needed
 * Returns true if there are localStorage bookmarks but no Supabase bookmarks
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    // Check localStorage bookmarks
    const localBookmarks = getLocalStorageBookmarks();
    const localCount = Object.keys(localBookmarks).length;
    
    if (localCount === 0) {
      return false; // No local bookmarks to migrate
    }

    // Check Supabase bookmarks
    const response = await fetch('/api/bookmarks', {
      credentials: 'include'
    });
    if (response.ok) {
      const data = await response.json();
      const supabaseCount = data.bookmarks?.length || 0;
      
      // Migration needed if we have local bookmarks but no (or fewer) Supabase bookmarks
      return localCount > supabaseCount;
    }
    
    // If we can't check Supabase, assume migration might be needed
    return true;
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Clean up localStorage bookmarks after successful migration
 * Only call this after confirming Supabase migration was successful
 */
export function cleanupLocalBookmarksAfterMigration(): void {
  try {
    const localBookmarks = getLocalStorageBookmarks();
    const bookmarkIds = Object.keys(localBookmarks);
    
    console.log(`🧹 Cleaning up ${bookmarkIds.length} localStorage bookmarks after migration...`);
    
    // Clear the localStorage
    localStorage.removeItem('agnext-bookmarks');
    
    console.log('✅ localStorage bookmarks cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up localStorage:', error);
  }
} 