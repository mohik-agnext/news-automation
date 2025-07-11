import { useState, useEffect, useCallback } from 'react';

export interface LinkedInContent {
  id: string;
  session_id: string;
  article_id: string;
  article_title?: string;
  article_url?: string;
  article_source?: string;
  linkedin_post?: string;
  processing_status: string;
  tags?: string;
  summary?: string;
  estimated_engagement_score?: number;
  created_at: string;
  updated_at?: string;
}

export function useLinkedInContent() {
  const [linkedInContent, setLinkedInContent] = useState<Map<string, LinkedInContent>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedInContent = useCallback(async (sessionId?: string, articleId?: string) => {
    try {
      const loadingKey = articleId || 'all';
      setLoading(prev => new Set(prev).add(loadingKey));
      setError(null);

      console.log('🔍 Fetching LinkedIn content...');
      console.log('Article ID:', articleId || 'all articles');

      // Build URL with optional articleId parameter
      let url = '/api/linkedin';
      if (articleId) {
        const params = new URLSearchParams({ articleId });
        url = `/api/linkedin?${params.toString()}`;
      }

      console.log('📡 API URL:', url);

      const response = await fetch(url, {
        credentials: 'include' // Include authentication cookies
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP ${response.status}: Failed to fetch LinkedIn content`);
      }

      const data = await response.json();
      console.log('📊 API Response:', data);
      
      if (data.success && data.content) {
        console.log(`✅ Found ${data.content.length} LinkedIn content entries`);
        data.content.forEach((content: LinkedInContent) => {
          console.log(`- Article ID: ${content.article_id}, Status: ${content.processing_status}`);
        });

        setLinkedInContent(prev => {
          const newMap = new Map(prev);
          data.content.forEach((content: LinkedInContent) => {
            newMap.set(content.article_id, content);
          });
          return newMap;
        });
      } else {
        console.log('❌ No LinkedIn content found in response');
      }

    } catch (error) {
      console.error('❌ Error fetching LinkedIn content:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId || 'all');
        return newSet;
      });
    }
  }, []);

  const getLinkedInContent = useCallback((articleId: string) => {
    const content = linkedInContent.get(articleId);
    console.log(`🔎 Getting LinkedIn content for article: ${articleId}, Found: ${content ? 'Yes' : 'No'}`);
    return content;
  }, [linkedInContent]);

  const isLoading = useCallback((articleId?: string) => {
    return loading.has(articleId || 'all');
  }, [loading]);

  const hasLinkedInContent = useCallback((articleId: string) => {
    const hasContent = linkedInContent.has(articleId);
    console.log(`📋 Has LinkedIn content for ${articleId}: ${hasContent}`);
    return hasContent;
  }, [linkedInContent]);

  const clearLinkedInContent = useCallback(() => {
    setLinkedInContent(new Map());
    setError(null);
  }, []);

  return {
    fetchLinkedInContent,
    getLinkedInContent,
    isLoading,
    hasLinkedInContent,
    clearLinkedInContent,
    error,
    allLinkedInContent: linkedInContent
  };
} 