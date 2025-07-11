import { NextRequest, NextResponse } from 'next/server';
import { enrichBookmark } from '@/lib/bookmarks';

// POST /api/bookmarks/process-result - Receive LLM processing results
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.sessionId || !body.articleId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and articleId are required' },
        { status: 400 }
      );
    }

    console.log('📥 Received LLM processing result for article:', body.articleId);
    console.log('🔍 Session ID:', body.sessionId);

    // Normalize relevance score to 0-10 range if provided
    let normalizedRelevanceScore = null;
    if (body.relevanceScore !== null && body.relevanceScore !== undefined) {
      const rawScore = body.relevanceScore || body.agNextRelevanceScore || 0;
      // If score is > 10, assume it's on a 0-100 scale and convert to 0-10
      normalizedRelevanceScore = rawScore > 10 ? Math.round(rawScore / 10) : rawScore;
      // Ensure it's within bounds
      normalizedRelevanceScore = Math.max(0, Math.min(10, normalizedRelevanceScore));
    }

    // Extract enrichment data from the LLM response
    const enrichmentData = {
      summary: body.summary || body.llmSummary || null,
      tags: body.tags || body.extractedTags || null,
      relevanceScore: normalizedRelevanceScore ?? undefined, // Convert null to undefined
      enrichedData: {
        llmAnalysis: body.llmAnalysis || body.analysis || null,
        keyInsights: body.keyInsights || body.insights || null,
        agNextRelevance: body.agNextRelevance || null,
        qualityAssessment: body.qualityAssessment || null,
        processedAt: new Date().toISOString(),
        processingMethod: 'llm_webhook',
        originalRelevanceScore: body.relevanceScore, // Store original score
        originalData: {
          title: body.originalTitle,
          source: body.originalSource,
          description: body.originalDescription
        }
      }
    };

    console.log('💾 Enrichment data to save (relevance score normalized):', JSON.stringify(enrichmentData, null, 2));

    // Update the bookmark with enriched data
    try {
      await enrichBookmark(body.sessionId, body.articleId, enrichmentData);
      console.log('✅ Successfully called enrichBookmark function');
    } catch (enrichError) {
      console.error('❌ Error in enrichBookmark function:', enrichError);
      throw enrichError;
    }

    console.log('✅ Successfully enriched bookmark:', body.articleId);

    return NextResponse.json({
      success: true,
      message: 'Bookmark enriched successfully',
      articleId: body.articleId,
      sessionId: body.sessionId,
      enrichmentApplied: true,
      relevanceScoreNormalized: normalizedRelevanceScore,
      debug: {
        originalRelevanceScore: body.relevanceScore,
        normalizedRelevanceScore: normalizedRelevanceScore,
        enrichmentData: enrichmentData,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing LLM result:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process LLM result',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 