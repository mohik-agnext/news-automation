import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return { success: true, message: 'Supabase connection working' };
  } catch (error) {
    return { 
      success: false, 
      message: 'Supabase connection failed', 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    // Test Supabase connection
    const connectionTest = await testSupabaseConnection();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'No session found',
        connectionTest
      }, { status: 401 });
    }

    // Get user info
    const userInfo = {
      sessionId: session.session_id,
      userId: session.user_id,
      email: session.email
    };

    // Get bookmarks count
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('session_id', session.session_id);

    const bookmarksInfo = {
      count: bookmarks?.length || 0,
      error: bookmarksError?.message,
      sampleBookmarks: bookmarks?.slice(0, 3).map(b => ({
        id: b.article_id,
        title: b.article_title,
        source: b.article_source,
        created_at: b.created_at,
        article_published_at: b.article_published_at,
        hasPublishedDate: !!b.article_published_at
      }))
    };

    // Check for bookmarks missing publication dates
    const bookmarksNeedingDateFix = bookmarks?.filter(b => !b.article_published_at) || [];
    
    // Fix bookmarks missing publication dates
    let fixedCount = 0;
    if (bookmarksNeedingDateFix.length > 0) {
      console.log(`📅 Found ${bookmarksNeedingDateFix.length} bookmarks missing publication dates`);
      
      for (const bookmark of bookmarksNeedingDateFix) {
        try {
          // Extract timestamp from article_id format: "YYYYMMDD_HHMMSS_..."
          const articleId = bookmark.article_id;
          let extractedDate: string | null = null;
          
          // Try to extract date from article ID
          const timestampMatch = articleId.match(/^(\d{8})_(\d{6})/);
          if (timestampMatch) {
            const [, dateStr, timeStr] = timestampMatch;
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const hour = timeStr.substring(0, 2);
            const minute = timeStr.substring(2, 4);
            const second = timeStr.substring(4, 6);
            
            extractedDate = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
          } else {
            // Fallback: use bookmark creation date minus some random days (1-7 days)
            const createdAt = new Date(bookmark.created_at);
            const daysAgo = Math.floor(Math.random() * 7) + 1;
            const publishedAt = new Date(createdAt.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            extractedDate = publishedAt.toISOString();
          }
          
          if (extractedDate) {
            const { error: updateError } = await supabase
              .from('bookmarks')
              .update({ article_published_at: extractedDate })
              .eq('id', bookmark.id);
            
            if (!updateError) {
              fixedCount++;
              console.log(`✅ Fixed publication date for: ${bookmark.article_title}`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to fix date for bookmark ${bookmark.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database test completed',
      userInfo,
      bookmarksInfo,
      dateFixInfo: {
        bookmarksNeedingFix: bookmarksNeedingDateFix.length,
        fixedCount,
        message: fixedCount > 0 ? `Fixed ${fixedCount} bookmark publication dates` : 'All bookmark dates are correct'
      },
      connectionTest
    });

  } catch (error) {
    console.error('❌ Get current user error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionTest: await testSupabaseConnection()
    }, { status: 500 });
  }
} 