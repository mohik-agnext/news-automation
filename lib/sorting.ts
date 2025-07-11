import { Article, ProcessedArticle, SortOption } from '@/types/article';
import { calculateDisplayScore } from './scoring';

export const sortOptions: SortOption[] = [
  { value: 'relevance', label: 'Relevance (Highest First)' },
  { value: 'date', label: 'Date (Newest First)' },
  { value: 'publisher', label: 'Publisher (A-Z)' },
  { value: 'engagement', label: 'Engagement Score (Highest First)' }
];

export function sortArticles(articles: ProcessedArticle[], sortBy: SortOption['value']): ProcessedArticle[] {
  const sortedArticles = [...articles];
  
  switch (sortBy) {
    case 'relevance':
      return sortedArticles.sort((a, b) => {
        const scoreA = calculateDisplayScore(a.relevanceScore, a.qualityScore);
        const scoreB = calculateDisplayScore(b.relevanceScore, b.qualityScore);
        return scoreB - scoreA;
      });
      
    case 'date':
      return sortedArticles.sort((a, b) => {
        const dateA = new Date(a.publishedAt).getTime();
        const dateB = new Date(b.publishedAt).getTime();
        return dateB - dateA;
      });
      
    case 'publisher':
      return sortedArticles.sort((a, b) => {
        return a.source.localeCompare(b.source);
      });
      
    default:
      return sortedArticles;
  }
}

export function processArticles(articles: Article[], bookmarkedUrls: string[]): ProcessedArticle[] {
  return articles.map((article, index) => ({
    ...article,
    id: `${article.source}-${article.articleIndex}-${Date.now()}`,
    displayScore: calculateDisplayScore(article.relevanceScore, article.qualityScore),
    isBookmarked: bookmarkedUrls.includes(article.url)
  }));
}

export function filterArticles(articles: ProcessedArticle[], searchQuery?: string): ProcessedArticle[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return articles;
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return articles.filter(article => 
    article.title.toLowerCase().includes(query) ||
    article.description.toLowerCase().includes(query) ||
    article.source.toLowerCase().includes(query) ||
    article.author.toLowerCase().includes(query)
  );
} 