export interface Article {
  source: string;
  author: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  content: string;
  articleIndex: number;
  relevanceScore: number;
  qualityScore: number;
  agNextTags: {
    isHighlyRelevant: boolean;
    isRecentNews: boolean;
    hasIndiaFocus: boolean;
    hasAgNextKeywords: boolean;
    hasClientMention: boolean;
  };
  agNextMetadata: {
    wordCount: number;
    sourceReliability: string;
    publishedDaysAgo: number;
  };
}

export interface ProcessedArticle extends Article {
  id: string;
  displayScore: number;
  isBookmarked: boolean;
}

export interface SortOption {
  value: 'relevance' | 'date' | 'publisher' | 'engagement';
  label: string;
}

export interface KeywordTag {
  key: keyof Article['agNextTags'];
  label: string;
  color: string;
  isActive: boolean;
}

export interface ArticleFilters {
  sortBy: SortOption['value'];
  searchQuery?: string;
}

export interface WebhookPayload {
  articles: Article[];
  timestamp: string;
  totalCount: number;
} 