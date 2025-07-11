import { getScoreBadgeColor } from '@/lib/scoring';

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export default function ScoreBadge({ score, className = '' }: ScoreBadgeProps) {
  const { bgColor, textColor, label } = getScoreBadgeColor(score);
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor} ${className}`}>
      <span className="font-bold">{score}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
} 