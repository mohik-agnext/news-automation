import { Article, WebhookPayload } from '@/types/article';

export function validateArticle(data: any): data is Article {
  return (
    data &&
    typeof data.source === 'string' &&
    typeof data.author === 'string' &&
    typeof data.title === 'string' &&
    typeof data.description === 'string' &&
    typeof data.url === 'string' &&
    typeof data.publishedAt === 'string' &&
    typeof data.content === 'string' &&
    typeof data.articleIndex === 'number' &&
    typeof data.relevanceScore === 'number' &&
    typeof data.qualityScore === 'number' &&
    data.agNextTags &&
    typeof data.agNextTags.isHighlyRelevant === 'boolean' &&
    typeof data.agNextTags.isRecentNews === 'boolean' &&
    typeof data.agNextTags.hasIndiaFocus === 'boolean' &&
    typeof data.agNextTags.hasAgNextKeywords === 'boolean' &&
    typeof data.agNextTags.hasClientMention === 'boolean' &&
    data.agNextMetadata &&
    typeof data.agNextMetadata.wordCount === 'number' &&
    typeof data.agNextMetadata.sourceReliability === 'string' &&
    typeof data.agNextMetadata.publishedDaysAgo === 'number'
  );
}

export function processWebhookPayload(payload: any): Article[] {
  if (!Array.isArray(payload)) {
    throw new Error('Expected array of articles');
  }
  
  const validArticles = payload.filter(validateArticle);
  
  if (validArticles.length === 0) {
    throw new Error('No valid articles found in payload');
  }
  
  return validArticles;
}

export function sanitizeArticle(article: Article): Article {
  return {
    ...article,
    title: article.title.trim(),
    description: article.description.trim(),
    content: article.content.trim(),
    source: article.source.trim(),
    author: article.author.trim(),
    url: article.url.trim(),
    relevanceScore: Math.max(0, Math.min(10, article.relevanceScore)),
    qualityScore: Math.max(0, Math.min(10, article.qualityScore)),
    agNextMetadata: {
      ...article.agNextMetadata,
      wordCount: Math.max(0, article.agNextMetadata.wordCount),
      publishedDaysAgo: Math.max(0, article.agNextMetadata.publishedDaysAgo),
      sourceReliability: article.agNextMetadata.sourceReliability.toLowerCase()
    }
  };
}

export function generateArticleId(article: Article): string {
  // Create a unique ID based on article content
  const identifier = `${article.source}-${article.title}-${article.publishedAt}`;
  return Buffer.from(identifier).toString('base64url');
} 