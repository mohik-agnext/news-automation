import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LinkedInContent } from '@/hooks/useLinkedInContent';

interface LinkedInContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string;
  articleUrl: string;
  linkedInContent: LinkedInContent | null;
  loading: boolean;
}

export default function LinkedInContentModal({
  isOpen,
  onClose,
  articleTitle,
  articleUrl,
  linkedInContent,
  loading
}: LinkedInContentModalProps) {
  const [copied, setCopied] = useState<'post' | 'hashtags' | null>(null);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 LinkedIn Modal opened with:', {
        articleTitle,
        linkedInContent,
        loading,
        hasContent: !!linkedInContent
      });
    }
  }, [isOpen, linkedInContent, loading, articleTitle]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const copyToClipboard = async (text: string, type: 'post' | 'hashtags') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  if (!isOpen) return null;

  // Use portal to render modal outside normal DOM flow
  if (typeof window === 'undefined') return null;

  const modalContent = (
    <div 
      className="linkedin-modal-backdrop bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="linkedin-modal bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-200/50 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">LinkedIn Content</h2>
                <p className="text-sm text-slate-600 font-medium">AI-generated social post with analytics</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors duration-200 group"
            >
              <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area - Improved layout */}
        <div 
          className="overflow-y-auto"
          style={{ 
            maxHeight: 'calc(90vh - 120px)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          <div className="p-8 space-y-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 mt-6 font-medium">Generating LinkedIn content...</p>
              </div>
            ) : linkedInContent ? (
            <div className="space-y-8">
              
              {/* Article Reference Card */}
              <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wide">Original Article</h3>
                    <h4 className="text-lg font-medium text-slate-800 mb-3 leading-snug line-clamp-2">{articleTitle}</h4>
                    <a
                      href={articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200 group"
                    >
                      View Article
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* LinkedIn Post Content */}
              {linkedInContent.linkedin_post && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">LinkedIn Post</h3>
                    <button
                      onClick={() => copyToClipboard(linkedInContent.linkedin_post || '', 'post')}
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                        copied === 'post'
                          ? 'bg-green-100 text-green-700 shadow-sm'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm'
                      }`}
                    >
                      {copied === 'post' ? (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </span>
                      ) : 'Copy Post'}
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm">
                    <div className="prose prose-slate max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                        {linkedInContent.linkedin_post}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags Section */}
              {linkedInContent.tags && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Tags</h3>
                    <button
                      onClick={() => {
                        try {
                          const tagsArray = JSON.parse(linkedInContent.tags || '[]');
                          copyToClipboard(Array.isArray(tagsArray) ? tagsArray.join(' ') : linkedInContent.tags || '', 'hashtags');
                        } catch {
                          copyToClipboard(linkedInContent.tags || '', 'hashtags');
                        }
                      }}
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                        copied === 'hashtags'
                          ? 'bg-green-100 text-green-700 shadow-sm'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm'
                      }`}
                    >
                      {copied === 'hashtags' ? (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </span>
                      ) : 'Copy Tags'}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      try {
                        const tagsArray = JSON.parse(linkedInContent.tags || '[]');
                        return Array.isArray(tagsArray) ? tagsArray.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium border border-blue-100 hover:bg-blue-100 transition-colors duration-200"
                          >
                            {tag}
                          </span>
                        )) : (
                          <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium border border-blue-100">
                            {linkedInContent.tags}
                          </span>
                        );
                      } catch {
                        return (
                          <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium border border-blue-100">
                            {linkedInContent.tags}
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {linkedInContent.summary && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-slate-700 leading-relaxed">
                      {linkedInContent.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    linkedInContent.processing_status === 'completed' ? 'bg-green-500' : 
                    linkedInContent.processing_status === 'processing' ? 'bg-amber-500' : 
                    'bg-slate-400'
                  }`}></div>
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {linkedInContent.processing_status || 'pending'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Created {new Date(linkedInContent.created_at).toLocaleDateString()}
                  {linkedInContent.updated_at && linkedInContent.updated_at !== linkedInContent.created_at && 
                    ` • Updated ${new Date(linkedInContent.updated_at).toLocaleDateString()}`
                  }
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                No LinkedIn Content Yet
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                LinkedIn content will be automatically generated when you bookmark articles from your search results.
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 max-w-md mx-auto">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-blue-800 text-sm font-medium leading-relaxed">
                      Bookmark any article to trigger automatic LinkedIn content generation powered by AI.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 