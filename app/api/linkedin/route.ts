import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession(request);
    
    if (!session || typeof (session as any).session_id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Session object missing session_id'
      }, { status: 401 });
    }
    const session_id = (session as { session_id: string }).session_id;
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    
    console.log(`🔍 LinkedIn API GET Request`);
    console.log(`Session ID: ${session_id}`);
    console.log(`Article ID: ${articleId}`);

    let query = supabase
      .from('linkedin_content')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false });

    if (articleId) {
      console.log(`🔍 Filtering for article: ${articleId}`);
      query = query.eq('article_id', articleId);
    }

    const { data: linkedinContent, error } = await query;

    if (error) {
      console.error('❌ Supabase error fetching LinkedIn content:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch LinkedIn content'
      }, { status: 500 });
    }

    console.log(`✅ Successfully fetched ${linkedinContent?.length || 0} LinkedIn content entries`);

    // Map database fields to frontend expected fields
    const mappedContent = (linkedinContent || []).map((content: any) => ({
      id: content.id,
      session_id: content.session_id,
      article_id: content.article_id,
      article_title: content.original_title, // Map original_title to article_title
      article_url: content.original_url,
      article_source: content.original_source,
      linkedin_post: content.linkedin_post_text, // Map linkedin_post_text to linkedin_post
      processing_status: content.processing_status || 'pending',
      tags: content.linkedin_hashtags ? JSON.stringify(content.linkedin_hashtags) : null, // Map linkedin_hashtags to tags
      summary: content.original_title, // Use original_title as summary
      created_at: content.created_at,
      updated_at: content.updated_at,
      estimated_engagement_score: content.estimated_engagement_score
    }));

    return NextResponse.json({
      success: true,
      content: mappedContent,
      sessionId: session_id
    });

  } catch (error) {
    console.error('❌ Error in LinkedIn API GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
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
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    console.log('📝 LinkedIn API POST Request Body:', body);

    const {
      article_id,
      article_title,
      article_url,
      article_source,
      linkedin_post,
      linkedin_post_text, // Accept both formats
      processing_status = 'completed',
      tags,
      linkedin_hashtags, // Accept both formats
      summary
    } = body;

    if (!article_id || !article_title) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: article_id and article_title'
      }, { status: 400 });
    }

    // Check if LinkedIn content already exists
    const { data: existingContent } = await supabase
      .from('linkedin_content')
      .select('id')
      .eq('session_id', session_id)
      .eq('article_id', article_id)
      .single();

    if (existingContent) {
      console.log('🔄 Updating existing LinkedIn content for article:', article_id);
      
      const { data: updatedContent, error: updateError } = await supabase
        .from('linkedin_content')
        .update({
          original_title: article_title,
          original_url: article_url,
          original_source: article_source,
          linkedin_post_text: linkedin_post || linkedin_post_text,
          processing_status,
          linkedin_hashtags: linkedin_hashtags || (tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : null),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContent.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating LinkedIn content:', updateError);
        if (updateError.code === '23505') {
          // Duplicate key constraint - return the existing content
          console.log('🔄 Duplicate key detected, retrieving existing content...');
          const { data: existingData } = await supabase
            .from('linkedin_content')
            .select('*')
            .eq('session_id', session_id)
            .eq('article_id', article_id)
            .single();
          
          // Map the fields for consistency
          const mappedExistingData = existingData ? {
            id: existingData.id,
            session_id: existingData.session_id,
            article_id: existingData.article_id,
            article_title: existingData.original_title,
            article_url: existingData.original_url,
            article_source: existingData.original_source,
            linkedin_post: existingData.linkedin_post_text,
            processing_status: existingData.processing_status || 'pending',
            tags: existingData.linkedin_hashtags ? JSON.stringify(existingData.linkedin_hashtags) : null,
            summary: existingData.original_title,
            created_at: existingData.created_at,
            updated_at: existingData.updated_at,
            estimated_engagement_score: existingData.estimated_engagement_score
          } : null;

          return NextResponse.json({
            success: true,
            content: mappedExistingData,
            message: 'Content already exists',
            sessionId: session_id
          });
        }
        throw updateError;
      }

      console.log('✅ Successfully updated LinkedIn content:', updatedContent.id);
      
      // Map the updated content for consistency
      const mappedUpdatedContent = {
        id: updatedContent.id,
        session_id: updatedContent.session_id,
        article_id: updatedContent.article_id,
        article_title: updatedContent.original_title,
        article_url: updatedContent.original_url,
        article_source: updatedContent.original_source,
        linkedin_post: updatedContent.linkedin_post_text,
        processing_status: updatedContent.processing_status || 'pending',
        tags: updatedContent.linkedin_hashtags ? JSON.stringify(updatedContent.linkedin_hashtags) : null,
        summary: updatedContent.original_title,
        created_at: updatedContent.created_at,
        updated_at: updatedContent.updated_at,
        estimated_engagement_score: updatedContent.estimated_engagement_score
      };
      
      return NextResponse.json({
        success: true,
        content: mappedUpdatedContent,
        sessionId: session_id
      });
    } else {
      console.log('➕ Creating new LinkedIn content for article:', article_id);
      
      // Use upsert to handle potential duplicate key errors
      const contentData = {
        session_id: session_id,
        article_id,
        original_title: article_title,
        original_url: article_url || '',
        original_source: article_source || 'Unknown',
        linkedin_post_text: linkedin_post || linkedin_post_text || '',
        processing_status,
        linkedin_hashtags: linkedin_hashtags || (tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : null)
      };
      
      // Try upsert approach first
      const { data: newContent, error: insertError } = await supabase
        .from('linkedin_content')
        .upsert(contentData, { 
          onConflict: 'session_id,article_id',
          ignoreDuplicates: false // Update on conflict
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating LinkedIn content:', insertError);
        if (insertError.code === '23505') {
          // Duplicate key constraint - return the existing content
          console.log('🔄 Duplicate key detected during upsert, retrieving existing content...');
          try {
            const { data: existingData } = await supabase
              .from('linkedin_content')
              .select('*')
              .eq('session_id', session_id)
              .eq('article_id', article_id)
              .single();
            
            // Map the fields for consistency
            const mappedExistingData = existingData ? {
              id: existingData.id,
              session_id: existingData.session_id,
              article_id: existingData.article_id,
              article_title: existingData.original_title,
              article_url: existingData.original_url,
              article_source: existingData.original_source,
              linkedin_post: existingData.linkedin_post_text,
              processing_status: existingData.processing_status || 'pending',
              tags: existingData.linkedin_hashtags ? JSON.stringify(existingData.linkedin_hashtags) : null,
              summary: existingData.original_title,
              created_at: existingData.created_at,
              updated_at: existingData.updated_at,
              estimated_engagement_score: existingData.estimated_engagement_score
            } : null;

            return NextResponse.json({
              success: true,
              content: mappedExistingData,
              message: 'Content already exists',
              sessionId: session_id
            });
          } catch (fetchError) {
            console.error('❌ Error fetching existing LinkedIn content:', fetchError);
            // Try one more approach - update instead of insert
            try {
              const { data: updatedContent, error: updateError } = await supabase
                .from('linkedin_content')
                .update(contentData)
                .eq('session_id', session_id)
                .eq('article_id', article_id)
                .select()
                .single();
                
              if (!updateError && updatedContent) {
                console.log('✅ Successfully updated LinkedIn content as fallback:', updatedContent.id);
                
                // Map the updated content for consistency
                const mappedUpdatedContent = {
                  id: updatedContent.id,
                  session_id: updatedContent.session_id,
                  article_id: updatedContent.article_id,
                  article_title: updatedContent.original_title,
                  article_url: updatedContent.original_url,
                  article_source: updatedContent.original_source,
                  linkedin_post: updatedContent.linkedin_post_text,
                  processing_status: updatedContent.processing_status || 'pending',
                  tags: updatedContent.linkedin_hashtags ? JSON.stringify(updatedContent.linkedin_hashtags) : null,
                  summary: updatedContent.original_title,
                  created_at: updatedContent.created_at,
                  updated_at: updatedContent.updated_at,
                  estimated_engagement_score: updatedContent.estimated_engagement_score
                };
                
                return NextResponse.json({
                  success: true,
                  content: mappedUpdatedContent,
                  sessionId: session_id
                });
              }
            } catch (updateFallbackError) {
              console.error('❌ All approaches failed for LinkedIn content:', updateFallbackError);
            }
          }
        }
        throw insertError;
      }

      console.log('✅ Successfully created LinkedIn content:', newContent.id);
      
      // Map the new content for consistency
      const mappedNewContent = {
        id: newContent.id,
        session_id: newContent.session_id,
        article_id: newContent.article_id,
        article_title: newContent.original_title,
        article_url: newContent.original_url,
        article_source: newContent.original_source,
        linkedin_post: newContent.linkedin_post_text,
        processing_status: newContent.processing_status || 'pending',
        tags: newContent.linkedin_hashtags ? JSON.stringify(newContent.linkedin_hashtags) : null,
        summary: newContent.original_title,
        created_at: newContent.created_at,
        updated_at: newContent.updated_at,
        estimated_engagement_score: newContent.estimated_engagement_score
      };
      
      return NextResponse.json({
        success: true,
        content: mappedNewContent,
        sessionId: session_id
      });
    }

  } catch (error) {
    console.error('❌ Error in LinkedIn API POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
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
    
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    
    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }

    console.log(`🗑️ Deleting LinkedIn content: session=${session_id}, articleId=${articleId}`);
    
    const { error } = await supabase
      .from('linkedin_content')
      .delete()
      .eq('session_id', session_id)
      .eq('article_id', articleId);

    if (error) {
      console.error('❌ Error deleting LinkedIn content:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete LinkedIn content'
      }, { status: 500 });
    }

    console.log(`✅ Successfully deleted LinkedIn content for: ${articleId}`);
    return NextResponse.json({
      success: true,
      message: 'LinkedIn content deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error in LinkedIn API DELETE:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}