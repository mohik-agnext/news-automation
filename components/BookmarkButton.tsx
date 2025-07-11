import { useState } from 'react';
import { ProcessedArticle } from '@/types/article';

interface BookmarkButtonProps {
  article: ProcessedArticle;
  isBookmarked: boolean;
  onToggle: (article: ProcessedArticle) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export default function BookmarkButton({ 
  article, 
  isBookmarked, 
  onToggle, 
  loading = false,
  className = '' 
}: BookmarkButtonProps) {
  const [localLoading, setLocalLoading] = useState(false);

  const handleClick = async () => {
    if (localLoading) return; // Prevent double-clicks
    
    setLocalLoading(true);
    try {
      await onToggle(article);
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
    } finally {
      // Add small delay for visual feedback
      setTimeout(() => setLocalLoading(false), 300);
    }
  };

  const isProcessing = loading || localLoading;

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={`
        group relative p-2 rounded-xl transition-all duration-200
        ${isBookmarked 
          ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' 
          : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600'
        }
        ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        transform hover:scale-105 active:scale-95
        ${className}
      `}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      type="button"
    >
      {/* Loading Spinner */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60"></div>
        </div>
      )}
      
      {/* Bookmark Icon */}
      <div className={`transition-all duration-200 ${isProcessing ? 'opacity-0' : 'opacity-100'}`}>
        {isBookmarked ? (
          // Filled bookmark icon
          <svg 
            className="w-5 h-5 transform transition-transform duration-200 group-hover:scale-110" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        ) : (
          // Outline bookmark icon
          <svg 
            className="w-5 h-5 transform transition-transform duration-200 group-hover:scale-110" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" 
            />
          </svg>
        )}
      </div>

      {/* Success animation overlay */}
      {!isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity duration-150">
          <div className="w-6 h-6 rounded-full bg-current opacity-20 scale-0 group-active:scale-100 transition-transform duration-150"></div>
        </div>
      )}
    </button>
  );
} 