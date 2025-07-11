import { NextRequest, NextResponse } from 'next/server';
import { broadcastUpdate } from '@/lib/realtime';
import { articlesStore } from '@/lib/articlesStore';

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();
    
    // Handle both array and string formats for backwards compatibility
    let keywordArray: string[];
    if (Array.isArray(keywords)) {
      keywordArray = keywords;
    } else if (typeof keywords === 'string') {
      keywordArray = [keywords];
    } else {
      return NextResponse.json(
        { error: 'Keywords must be provided as an array or string' },
        { status: 400 }
      );
    }
    
    // Filter out empty keywords
    const cleanKeywords = keywordArray
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
      
    if (cleanKeywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid keyword is required' },
        { status: 400 }
      );
    }
    
    // SERP mode only - prepare user query for semantic processing
    const searchQuery = cleanKeywords.join(' ');
    const displayText = `${cleanKeywords.join(' ')} (Google News via SERP API)`;
    
    console.log(`🔍 SERP Search - User query: "${searchQuery}"`);
    console.log(`📝 Display text: "${displayText}"`);
    
    // Use Google SERP search endpoint for high-quality semantic search
    const n8nWebhookUrl = 'http://127.0.0.1:5678/webhook/serp';
    console.log(`🔍 Triggering SERP search webhook: ${n8nWebhookUrl}`);
    
    // Prepare payload for SERP search (your workflow expects 'chatInput')
    const payload = {
      chatInput: searchQuery,
      searchMode: 'serp',
      searchType: 'news',
      location: 'India',
      language: 'en'
    };

    console.log('🚀 About to call n8n webhook with payload:', JSON.stringify(payload, null, 2));
    
    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!webhookResponse.ok) {
      console.error('n8n webhook failed:', webhookResponse.status, webhookResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to trigger news search workflow' },
        { status: 500 }
      );
    }
    
    let result;
    try {
      const responseText = await webhookResponse.text();
      if (!responseText.trim()) {
        console.log('⚠️ n8n returned empty response');
        result = [];
      } else {
        result = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('Error parsing n8n response:', parseError);
      return NextResponse.json(
        { error: 'Invalid response from news search workflow' },
        { status: 500 }
      );
    }
    
    console.log(`✅ n8n workflow triggered successfully. Received ${result?.length || 0} articles`);
    
    // PROCESS SERP API RESPONSE: Convert raw SERP format to frontend format
    if (result && Array.isArray(result) && result.length > 0) {
      console.log('🔄 Processing raw SERP API response...');
      
      // Extract news_results from SERP response
      let articles = [];
      if (result[0]?.news_results && Array.isArray(result[0].news_results)) {
        articles = result[0].news_results;
        console.log(`📰 Found ${articles.length} news articles in SERP response`);
      } else {
        console.log('⚠️ No news_results found in SERP response');
        articles = [];
      }
      
      // Convert SERP format to frontend format
      const validatedNewArticles = articles.map((article: any, index: number) => {
        // Extract basic fields from SERP format
        const title = article.title || 'Untitled Article';
        const url = article.link || '#';
        const source = article.source?.name || 'Unknown Source';
        
        // Parse date from SERP format
        let publishedAt = new Date().toISOString();
        let daysAgo = 0;
        if (article.date) {
          try {
            const dateObj = new Date(article.date);
            publishedAt = dateObj.toISOString();
            daysAgo = Math.ceil((new Date().getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
          } catch (e) {
            console.log('⚠️ Date parsing failed for article:', article.date);
          }
        }
        
        // Generate unique ID
        const id = `serp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`;
        
        // Calculate basic scores
        const relevanceScore = Math.min(50 + (title.length / 10), 100);
        const qualityScore = source.includes('Times') || source.includes('BBC') || source.includes('Reuters') ? 90 : 70;
        const displayScore = Math.round((relevanceScore + qualityScore) / 2);
        
        // Basic content analysis
        const textContent = title.toLowerCase();
        const hasFood = textContent.includes('food');
        const hasAgriculture = textContent.includes('agriculture') || textContent.includes('farming');
        const hasIndia = textContent.includes('india') || textContent.includes('indian');
        
        return {
          id: id,
          title: title,
          description: title, // Use title as description since no snippet
          content: title,
          url: url,
          source: source,
          publishedAt: publishedAt,
          author: null,
          articleIndex: index,
          relevanceScore: relevanceScore,
          qualityScore: qualityScore,
          displayScore: displayScore,
          agNextMetadata: {
            wordCount: title.split(' ').length,
            sourceReliability: qualityScore > 80 ? 'high' : 'medium',
            publishedDaysAgo: daysAgo
          },
          agNextTags: {
            isHighlyRelevant: relevanceScore > 70,
            isRecentNews: daysAgo <= 7,
            hasIndiaFocus: hasIndia,
            hasAgNextKeywords: hasFood || hasAgriculture,
            hasClientMention: textContent.includes('agnext')
          }
        };
      });
      
      // REPLACE existing articles with new search results (don't accumulate)
      articlesStore.setArticles(validatedNewArticles);
      console.log(`📦 Replaced articles with ${validatedNewArticles.length} new articles from search`);
      
      // Broadcast update to all connected clients via SSE
      const update = {
        type: 'new_articles' as const,
        data: {
          articles: validatedNewArticles,
          totalCount: validatedNewArticles.length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
      broadcastUpdate(update);
    } else {
      // No articles found, clear the store
      articlesStore.setArticles([]);
      console.log(`📦 No articles found, cleared store`);
      
      // Broadcast update to all connected clients via SSE
      const update = {
        type: 'articles_cleared' as const,
        data: {
          articles: [],
          totalCount: 0,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
      broadcastUpdate(update);
    }
    
    return NextResponse.json({
      success: true,
      message: `Search initiated for "${displayText}"`,
      articlesFound: result?.length || 0,
      keywords: cleanKeywords,
      searchQuery: searchQuery,
      searchMode: 'serp',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Search API error - Full details:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    return NextResponse.json(
      { error: 'Internal server error during search' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Clear all articles from the store
    articlesStore.setArticles([]);
    console.log(`🗑️ Cleared all articles from store`);
    
    // Broadcast update to all connected clients via SSE
    const update = {
      type: 'articles_cleared' as const,
      data: {
        articles: [],
        totalCount: 0,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    broadcastUpdate(update);
    
    return NextResponse.json({
      success: true,
      message: 'All articles cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Clear articles error:', error);
    return NextResponse.json(
      { error: 'Internal server error clearing articles' },
      { status: 500 }
    );
  }
} 