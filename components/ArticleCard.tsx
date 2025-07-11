import { useState, useEffect } from 'react';
import { ProcessedArticle } from '@/types/article';
import { formatDaysAgo } from '@/lib/dateUtils';
import ScoreBadge from './ScoreBadge';
import KeywordTags from './KeywordTags';
import BookmarkButton from './BookmarkButton';
import LinkedInContentModal from './LinkedInContentModal';
import { useLinkedInContent } from '@/hooks/useLinkedInContent';

interface ArticleCardProps {
  article: ProcessedArticle;
  isBookmarked: boolean;
  onBookmarkToggle: (article: ProcessedArticle) => Promise<void>;
  bookmarkLoading: boolean;
  sessionId?: string;
  showLinkedInButton?: boolean;
}

export default function ArticleCard({ 
  article, 
  isBookmarked, 
  onBookmarkToggle, 
  bookmarkLoading,
  sessionId,
  showLinkedInButton = false
}: ArticleCardProps) {
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const { fetchLinkedInContent, getLinkedInContent, isLoading } = useLinkedInContent();
  
  // Fetch LinkedIn content for bookmarked articles to show engagement score
  useEffect(() => {
    if (isBookmarked && sessionId && showLinkedInButton) {
      // Fetch LinkedIn content to get engagement score
      fetchLinkedInContent(sessionId, article.id);
    }
  }, [isBookmarked, sessionId, showLinkedInButton, article.id, fetchLinkedInContent]);
  
  const handleLinkedInClick = async () => {
    // Fetch LinkedIn content using authenticated session
    await fetchLinkedInContent(sessionId, article.id);
    setShowLinkedInModal(true);
  };

  const linkedInContent = sessionId ? (getLinkedInContent(article.id) || null) : null;

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-xl hover:border-slate-300/40 transition-all duration-300 hover:-translate-y-1 group overflow-hidden">
      <div className="p-6">
        {/* Header with Score Badge and Bookmark */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <ScoreBadge score={article.displayScore} />
          </div>
          <div className="flex items-center space-x-3">
            {/* Engagement Score - Show if available */}
            {linkedInContent?.estimated_engagement_score && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-white/20 backdrop-blur-sm">
                <span>{linkedInContent.estimated_engagement_score}%</span>
              </div>
            )}
            <BookmarkButton
              article={article}
              isBookmarked={isBookmarked}
              onToggle={onBookmarkToggle}
              loading={bookmarkLoading}
            />
          </div>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-lg text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-700 transition-colors duration-300 leading-snug tracking-tight">
          {article.title}
        </h3>
        
        {/* Publisher and Date */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="font-semibold text-blue-600 tracking-wide">
            {article.source}
          </span>
          <span className="text-slate-500 font-medium">
            {article.agNextMetadata?.publishedDaysAgo !== undefined 
              ? formatDaysAgo(article.agNextMetadata.publishedDaysAgo)
              : 'Unknown date'
            }
          </span>
        </div>
        
        {/* Description - Only show if different from title */}
        {article.description && article.description !== article.title && (
          <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {article.description}
          </p>
        )}
        
        {/* Keyword Tags */}
        <KeywordTags agNextTags={article.agNextTags} className="mb-4" />
        
        {/* Metadata */}
        <div className="flex items-center gap-4 mb-5 text-xs text-slate-500">
          {article.agNextMetadata?.wordCount && (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{article.agNextMetadata.wordCount.toLocaleString()} words</span>
            </div>
          )}
          {article.agNextMetadata?.sourceReliability && (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="capitalize">{article.agNextMetadata.sourceReliability} reliability</span>
            </div>
          )}
          {article.author && (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>By {article.author}</span>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          {/* LinkedIn Content Button - Only show for bookmarked articles */}
          {showLinkedInButton && isBookmarked && (
            <button
              onClick={handleLinkedInClick}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <div className="flex items-center space-x-2">
                <span>{linkedInContent ? 'View LinkedIn Content' : 'Generate LinkedIn Content'}</span>
                {linkedInContent && (
                  <div className="flex items-center space-x-1">
                    {linkedInContent.processing_status === 'completed' && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                    {linkedInContent.processing_status === 'processing' && (
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                )}
              </div>
            </button>
          )}
          
          {/* Read Full Article Button */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Read Full Article
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* LinkedIn Content Modal */}
        <LinkedInContentModal
          isOpen={showLinkedInModal}
          onClose={() => setShowLinkedInModal(false)}
          articleTitle={article.title}
          articleUrl={article.url}
          linkedInContent={linkedInContent}
          loading={isLoading(article.id)}
        />
      </div>
    </article>
  );
} 