import { Article } from '@/types/article';

export function calculateDisplayScore(relevanceScore: number, qualityScore: number): number {
  return Math.min(100, Math.round((relevanceScore + qualityScore) * 10));
}

export function getScoreBadgeColor(score: number): {
  bgColor: string;
  textColor: string;
  label: string;
} {
  if (score >= 80) {
    return {
      bgColor: 'bg-agnext-green',
      textColor: 'text-white',
      label: 'Excellent'
    };
  } else if (score >= 60) {
    return {
      bgColor: 'bg-agnext-blue',
      textColor: 'text-white',
      label: 'Good'
    };
  } else if (score >= 40) {
    return {
      bgColor: 'bg-agnext-yellow',
      textColor: 'text-white',
      label: 'Fair'
    };
  } else {
    return {
      bgColor: 'bg-agnext-red',
      textColor: 'text-white',
      label: 'Low'
    };
  }
}

export function getKeywordTags(agNextTags: Article['agNextTags']) {
  const tags = [];
  
  if (agNextTags.isHighlyRelevant) {
    tags.push({
      key: 'isHighlyRelevant' as const,
      label: 'High Relevance',
      color: 'bg-agnext-green text-white',
      isActive: true
    });
  }
  
  if (agNextTags.hasIndiaFocus) {
    tags.push({
      key: 'hasIndiaFocus' as const,
      label: 'India Focus',
      color: 'bg-agnext-blue text-white',
      isActive: true
    });
  }
  
  if (agNextTags.hasAgNextKeywords) {
    tags.push({
      key: 'hasAgNextKeywords' as const,
      label: 'AgNext Keywords',
      color: 'bg-agnext-orange text-white',
      isActive: true
    });
  }
  
  if (agNextTags.hasClientMention) {
    tags.push({
      key: 'hasClientMention' as const,
      label: 'Client Mention',
      color: 'bg-agnext-purple text-white',
      isActive: true
    });
  }
  
  return tags;
}

export function getSourceReliabilityBadge(reliability: string): {
  color: string;
  label: string;
} {
  switch (reliability.toLowerCase()) {
    case 'high':
      return { color: 'bg-green-100 text-green-800', label: 'High' };
    case 'medium':
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' };
    case 'low':
      return { color: 'bg-red-100 text-red-800', label: 'Low' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
  }
} 