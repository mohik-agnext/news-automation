import { NextRequest, NextResponse } from 'next/server';
import { addSharedBookmark } from '@/lib/bookmarks-shared';
import { ProcessedArticle } from '@/types/article';

// POST /api/bookmarks/sync - Sync localStorage bookmarks to shared collection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookmarks } = body;
    
    if (!Array.isArray(bookmarks)) {
      return NextResponse.json(
        { error: 'Invalid bookmarks data' },
        { status: 400 }
      );
    }

    let synced = 0;
    let skipped = 0;
    
    // Sync bookmarks to the shared collection
    for (const bookmarkData of bookmarks) {
      try {
        // Convert localStorage bookmark format to ProcessedArticle format
        const article: ProcessedArticle = {
          id: bookmarkData.id || `imported-${Date.now()}-${Math.random()}`,
          url: bookmarkData.url || bookmarkData.id,
          title: bookmarkData.title || 'Imported Bookmark',
          description: bookmarkData.description || 'Imported from localStorage',
          source: bookmarkData.source || 'Imported',
          publishedAt: bookmarkData.publishedAt || new Date().toISOString(),
          content: bookmarkData.content || '',
          author: bookmarkData.author || 'Unknown',
          articleIndex: bookmarkData.articleIndex || 0,
          relevanceScore: bookmarkData.relevanceScore || 1,
          qualityScore: bookmarkData.qualityScore || 1,
          displayScore: bookmarkData.displayScore || 20,
          isBookmarked: true,
          agNextTags: {
            isHighlyRelevant: bookmarkData.agNextTags?.isHighlyRelevant || false,
            isRecentNews: bookmarkData.agNextTags?.isRecentNews || false,
            hasIndiaFocus: bookmarkData.agNextTags?.hasIndiaFocus || false,
            hasAgNextKeywords: bookmarkData.agNextTags?.hasAgNextKeywords || false,
            hasClientMention: bookmarkData.agNextTags?.hasClientMention || false,
          },
          agNextMetadata: {
            wordCount: bookmarkData.agNextMetadata?.wordCount || 0,
            sourceReliability: bookmarkData.agNextMetadata?.sourceReliability || 'unknown',
            publishedDaysAgo: bookmarkData.agNextMetadata?.publishedDaysAgo || 0,
          }
        };
        
        const result = await addSharedBookmark(article);
        
        if (result.success) {
          synced++;
        } else {
          skipped++;
          console.log(`Skipped bookmark: ${result.error}`);
        }
      } catch (error) {
        console.error('Error syncing individual bookmark:', error);
        skipped++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${synced} bookmarks to shared collection, skipped ${skipped} duplicates/errors`,
      synced,
      skipped,
      total: bookmarks.length
    });
    
  } catch (error) {
    console.error('Error syncing bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to sync bookmarks' },
      { status: 500 }
    );
  }
} 