import { NextRequest, NextResponse } from 'next/server';
import { Article, WebhookPayload } from '@/types/article';
import { broadcastUpdate } from '@/lib/realtime';

// In-memory storage for articles (in production, use database)
let articlesStore: Article[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook payload
    if (!body || !Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid payload format. Expected array of articles.' },
        { status: 400 }
      );
    }
    
    // Validate article structure
    const articles: Article[] = body.filter((article: any) => {
      return (
        article &&
        typeof article.source === 'string' &&
        typeof article.title === 'string' &&
        typeof article.url === 'string' &&
        typeof article.publishedAt === 'string' &&
        typeof article.relevanceScore === 'number' &&
        typeof article.qualityScore === 'number' &&
        article.agNextTags &&
        article.agNextMetadata
      );
    });
    
    if (articles.length === 0) {
      return NextResponse.json(
        { error: 'No valid articles found in payload' },
        { status: 400 }
      );
    }
    
    // Store new articles (replace existing for now)
    articlesStore = articles;
    
    console.log(`Received ${articles.length} articles via webhook`);
    console.log(`📊 Articles store now contains: ${articlesStore.length} articles`);
    console.log(`📝 Article titles: ${articles.map(a => a.title.substring(0, 50)).join(', ')}`);
    
    // Broadcast update to all connected clients via SSE
    const update = {
      type: 'new_articles' as const,
      data: {
        articles,
        totalCount: articles.length,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    broadcastUpdate(update);
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${articles.length} articles`,
      articleCount: articles.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AgNext News Intelligence Webhook Endpoint',
    status: 'active',
    articlesCount: articlesStore.length,
    lastUpdated: articlesStore.length > 0 ? new Date().toISOString() : null
  });
} 