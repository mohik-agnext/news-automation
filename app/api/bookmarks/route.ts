import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import { getBookmarksFromSupabase, addBookmarkToSupabase, removeBookmarkFromSupabase } from '@/lib/bookmarks';
import { supabase } from '@/lib/supabase';

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  return '127.0.0.1';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    // Type guard for session_id
    if (typeof (session as any).session_id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Session object missing session_id'
      }, { status: 401 });
    }
    const session_id = (session as { session_id: string }).session_id;
    console.log(`📖 Fetching bookmarks for session: ${session_id}`);
    
    const bookmarks = await getBookmarksFromSupabase(session_id);
    
    // Fix any bookmarks missing publication dates
    const bookmarksNeedingDateFix = bookmarks.filter(bookmark => !bookmark.article_published_at);
    
    if (bookmarksNeedingDateFix.length > 0) {
      console.log(`📅 Fixing ${bookmarksNeedingDateFix.length} bookmarks with missing publication dates`);
      
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
            // Fallback: use bookmark creation date minus random days (1-7 days)
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
              // Update the bookmark in our local array
              bookmark.article_published_at = extractedDate;
              console.log(`✅ Fixed publication date for: ${bookmark.article_title}`);
            } else {
              console.error(`❌ Failed to update publication date for bookmark ${bookmark.id}:`, updateError);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to fix date for bookmark ${bookmark.id}:`, error);
        }
      }
    }
    
    console.log(`✅ Successfully fetched ${bookmarks.length} bookmarks`);
    
    return NextResponse.json({
      success: true,
      bookmarks,
      count: bookmarks.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching bookmarks:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookmarks'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    if (!session || typeof (session as any).session_id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Session object missing session_id'
      }, { status: 401 });
    }
    const session_id = (session as { session_id: string }).session_id;
    
    const body = await request.json();
    const { articleId, articleUrl, articleTitle, articleSource, summary, relevanceScore, publishedAt } = body;
    
    if (!articleId || !articleUrl || !articleTitle) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    console.log(`➕ Adding bookmark: {
  session: '${session_id}',
  articleId: '${articleId}',
  title: '${articleTitle}'
}`);

    const clientIP = getClientIP(request);
    
    const article = {
      id: articleId,
      url: articleUrl,
      title: articleTitle,
      source: articleSource || 'Unknown',
      description: summary || '',
      author: '',
      publishedAt: publishedAt || new Date().toISOString(),
      content: summary || '',
      articleIndex: 0,
      relevanceScore: relevanceScore || 0,
      qualityScore: 70,
      displayScore: relevanceScore || 70,
      isBookmarked: true,
      agNextTags: {
        isHighlyRelevant: (relevanceScore || 0) > 70,
        isRecentNews: true,
        hasIndiaFocus: false,
        hasAgNextKeywords: false,
        hasClientMention: false
      },
      agNextMetadata: {
        wordCount: summary ? summary.split(' ').length : 0,
        sourceReliability: 'medium' as const,
        publishedDaysAgo: 0
      }
    };

    const result = await addBookmarkToSupabase(session_id, article, clientIP);
    
    // Check if bookmark already exists (result false means duplicate)
    if (result === false) {
      // Bookmark already exists - check if it has LinkedIn content
      console.log(`📌 Bookmark already exists for article: ${articleTitle}`);
      
      // Check if LinkedIn content exists for this article
      try {
        const { data: existingContent } = await supabase
          .from('linkedin_content')
          .select('id')
          .eq('session_id', session_id)
          .eq('article_id', articleId)
          .single();

        if (!existingContent) {
          // No LinkedIn content exists, trigger webhook
          console.log(`🔗 Triggering LinkedIn webhook for existing bookmark: ${articleTitle}`);
          
          const webhookUrl = process.env.LINKEDIN_WEBHOOK_URL || 'http://127.0.0.1:5678/webhook/linkedin';
          
          const webhookPayload = {
            session_id: session_id,
            article: {
              id: articleId,
              url: articleUrl,
              title: articleTitle,
              source: articleSource,
              description: summary,
              content: summary
            },
            timestamp: new Date().toISOString()
          };

          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });

          if (webhookResponse.ok) {
            console.log(`✅ LinkedIn webhook triggered successfully for existing bookmark: ${articleTitle}`);
          } else {
            console.warn(`⚠️ LinkedIn webhook failed for existing bookmark: ${articleTitle}`);
          }
        } else {
          console.log(`📄 LinkedIn content already exists for bookmark: ${articleTitle}`);
        }
      } catch (linkedinError) {
        console.error('❌ Error checking/triggering LinkedIn content:', linkedinError);
      }
      
      const bookmarkId = `${session_id}-${articleId}`;
      return NextResponse.json({
        success: true,
        bookmarkId,
        sessionId: session_id,
        message: 'Article already bookmarked'
      });
    } else if (result === true) {
      const bookmarkId = `${session_id}-${articleId}`;
      console.log(`✅ Successfully created bookmark: ${bookmarkId}`);
      
      // Trigger LinkedIn webhook for article processing
      try {
        console.log(`🔗 Triggering LinkedIn webhook for article processing: ${articleTitle}`);
        
        const webhookUrl = process.env.LINKEDIN_WEBHOOK_URL || 'http://127.0.0.1:5678/webhook/linkedin';
        
        const webhookPayload = {
          session_id: session_id,
          article: {
            id: articleId,
            url: articleUrl,
            title: articleTitle,
            source: articleSource,
            description: summary,
            content: summary
          },
          timestamp: new Date().toISOString()
        };

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (webhookResponse.ok) {
          console.log(`✅ LinkedIn webhook triggered successfully for article: ${articleTitle}`);
        } else {
          console.warn(`⚠️ LinkedIn webhook failed for article: ${articleTitle}`);
        }
      } catch (webhookError) {
        console.error('❌ Error triggering LinkedIn webhook:', webhookError);
      }
      
      return NextResponse.json({
        success: true,
        bookmarkId,
        sessionId: session_id
      });
    } else {
      throw new Error('Failed to create bookmark');
    }
    
  } catch (error) {
    console.error('❌ Error adding bookmark:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add bookmark'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    if (!session || typeof (session as any).session_id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Session object missing session_id'
      }, { status: 401 });
    }
    const session_id = (session as { session_id: string }).session_id;
    
    const body = await request.json();
    const { articleId, clearAll } = body;
    
    if (clearAll) {
      // Clear all bookmarks functionality can be implemented here if needed
      return NextResponse.json({
        success: false,
        error: 'Clear all not implemented'
      }, { status: 400 });
    }
    
    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }

    console.log(`➖ Removing bookmark: session=${session_id}, articleId=${articleId}`);
    
    const result = await removeBookmarkFromSupabase(session_id, articleId);
    
    if (result) {
      console.log(`✅ Successfully removed bookmark: ${articleId}`);
      return NextResponse.json({
        success: true,
        message: 'Bookmark removed successfully'
      });
    } else {
      throw new Error('Failed to remove bookmark');
    }
    
  } catch (error) {
    console.error('❌ Error removing bookmark:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove bookmark'
    }, { status: 500 });
  }
} 