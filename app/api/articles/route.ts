import { NextRequest, NextResponse } from 'next/server';
import { processArticles, filterArticles, sortArticles } from '@/lib/sorting';
import { SortOption } from '@/types/article';
import { articlesStore } from '@/lib/articlesStore';
import { getCurrentSession } from '@/lib/session';
import { getBookmarksFromSupabase } from '@/lib/bookmarks';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getCurrentSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current articles from shared store
    const rawArticles = articlesStore.getArticles();
    
    console.log(`📖 Articles API called - Found ${rawArticles.length} articles in shared store`);
    
    if (rawArticles.length === 0) {
      console.log(`⚠️ No articles available - returning empty response`);
      return NextResponse.json({
        articles: [],
        totalCount: 0,
        bookmarkedCount: 0,
        message: 'No articles available. Perform a search to find articles.'
      });
    }

    // Get user's bookmarked article URLs
    const userBookmarks = await getBookmarksFromSupabase(session.session_id);
    const bookmarkedUrls = userBookmarks.map(bookmark => bookmark.article_url);
    
    // Process articles with user's bookmark status
    const processedArticles = processArticles(rawArticles, bookmarkedUrls);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') as SortOption['value'] || 'relevance';
    const searchQuery = searchParams.get('search') || undefined;
    
    console.log(`🔧 Processing ${processedArticles.length} articles with sortBy: ${sortBy}`);
    
    // Filter articles if search query provided
    let filteredArticles = processedArticles;
    if (searchQuery) {
      filteredArticles = filterArticles(processedArticles, searchQuery);
      console.log(`🔍 Filtered to ${filteredArticles.length} articles for query: ${searchQuery}`);
    }
    
    // Sort articles
    const sortedArticles = sortArticles(filteredArticles, sortBy);
    
    // Get user's bookmark count
    const bookmarkedCount = userBookmarks.length;
    
    console.log(`✅ Returning ${sortedArticles.length} articles to client`);
    
    return NextResponse.json({
      articles: sortedArticles,
      totalCount: sortedArticles.length,
      bookmarkedCount: bookmarkedCount,
      sortBy,
      searchQuery: searchQuery || null,
      sessionId: session.session_id, // Use authenticated user's session ID
      lastUpdated: rawArticles.length > 0 ? new Date().toISOString() : null
    });
    
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
} 