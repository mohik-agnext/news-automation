/**
 * User-specific Bookmarks System
 * Each user has their own bookmarks tied to their authentication
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ProcessedArticle } from '@/types/article';

// File paths for storing user bookmarks
const DATA_DIR = path.join(process.cwd(), 'data');
const BOOKMARKS_DIR = path.join(DATA_DIR, 'bookmarks');

// Ensure bookmarks directory exists
async function ensureBookmarksDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(BOOKMARKS_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }
}

export interface UserBookmark {
  id: string;
  userId: string;
  article: ProcessedArticle;
  bookmarkedAt: string;
}

// Get bookmarks file path for a user
function getUserBookmarksFile(userId: string): string {
  return path.join(BOOKMARKS_DIR, `${userId}.json`);
}

// Load user bookmarks from file
async function loadUserBookmarks(userId: string): Promise<UserBookmark[]> {
  try {
    await ensureBookmarksDir();
    const filePath = getUserBookmarksFile(userId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save user bookmarks to file
async function saveUserBookmarks(userId: string, bookmarks: UserBookmark[]): Promise<void> {
  await ensureBookmarksDir();
  const filePath = getUserBookmarksFile(userId);
  await fs.writeFile(filePath, JSON.stringify(bookmarks, null, 2));
}

/**
 * Add a bookmark for a specific user
 */
export async function addUserBookmark(userId: string, article: ProcessedArticle): Promise<{ success: boolean; error?: string }> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    
    // Check if already bookmarked
    const existingIndex = bookmarks.findIndex(b => b.article.url === article.url);
    if (existingIndex !== -1) {
      return { success: true }; // Already bookmarked
    }
    
    const newBookmark: UserBookmark = {
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      article,
      bookmarkedAt: new Date().toISOString()
    };
    
    bookmarks.unshift(newBookmark); // Add to beginning for newest first
    await saveUserBookmarks(userId, bookmarks);
    
    console.log(`✅ Added bookmark for user ${userId}: ${article.title}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding user bookmark:', error);
    return { success: false, error: 'Failed to add bookmark' };
  }
}

/**
 * Remove a bookmark for a specific user
 */
export async function removeUserBookmark(userId: string, articleUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    const filteredBookmarks = bookmarks.filter(b => b.article.url !== articleUrl);
    
    if (filteredBookmarks.length === bookmarks.length) {
      return { success: true }; // Nothing to remove
    }
    
    await saveUserBookmarks(userId, filteredBookmarks);
    
    console.log(`🗑️ Removed bookmark for user ${userId}: ${articleUrl}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing user bookmark:', error);
    return { success: false, error: 'Failed to remove bookmark' };
  }
}

/**
 * Get all bookmarks for a specific user
 */
export async function getUserBookmarks(userId: string): Promise<{ success: boolean; bookmarks: UserBookmark[]; error?: string }> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    return { success: true, bookmarks };
  } catch (error) {
    console.error('Error getting user bookmarks:', error);
    return { success: false, bookmarks: [], error: 'Failed to get bookmarks' };
  }
}

/**
 * Check if an article is bookmarked by a specific user
 */
export async function isUserBookmarked(userId: string, articleUrl: string): Promise<boolean> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    return bookmarks.some(b => b.article.url === articleUrl);
  } catch (error) {
    console.error('Error checking user bookmark:', error);
    return false;
  }
}

/**
 * Get bookmark count for a specific user
 */
export async function getUserBookmarkCount(userId: string): Promise<number> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    return bookmarks.length;
  } catch (error) {
    console.error('Error getting user bookmark count:', error);
    return 0;
  }
}

/**
 * Get list of bookmarked article URLs for a specific user
 */
export async function getUserBookmarkedArticleIds(userId: string): Promise<string[]> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    return bookmarks.map(b => b.article.url);
  } catch (error) {
    console.error('Error getting user bookmarked article IDs:', error);
    return [];
  }
}

/**
 * Clear all bookmarks for a specific user
 */
export async function clearUserBookmarks(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await saveUserBookmarks(userId, []);
    console.log(`🧹 Cleared all bookmarks for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error clearing user bookmarks:', error);
    return { success: false, error: 'Failed to clear bookmarks' };
  }
}

/**
 * Get bookmarked articles for a specific user
 */
export async function getUserBookmarkedArticles(userId: string): Promise<{ success: boolean; articles: ProcessedArticle[]; error?: string }> {
  try {
    const bookmarks = await loadUserBookmarks(userId);
    const articles = bookmarks.map(b => b.article);
    return { success: true, articles };
  } catch (error) {
    console.error('Error getting user bookmarked articles:', error);
    return { success: false, articles: [], error: 'Failed to get bookmarked articles' };
  }
} 