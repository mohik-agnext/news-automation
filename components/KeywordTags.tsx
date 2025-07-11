import { Article } from '@/types/article';
import { getKeywordTags } from '@/lib/scoring';

interface KeywordTagsProps {
  agNextTags: Article['agNextTags'];
  className?: string;
}

export default function KeywordTags({ agNextTags, className = '' }: KeywordTagsProps) {
  const tags = getKeywordTags(agNextTags);
  
  if (tags.length === 0) {
    return null;
  }
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag.key}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${tag.color}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
} 