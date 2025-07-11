import { LinkedInContent } from '@/hooks/useLinkedInContent';

interface LinkedInStatusBadgeProps {
  linkedInContent: LinkedInContent | null;
  onClick?: () => void;
  className?: string;
}

export default function LinkedInStatusBadge({ 
  linkedInContent, 
  onClick,
  className = '' 
}: LinkedInStatusBadgeProps) {
  
  const getStatusConfig = () => {
    if (!linkedInContent) {
      return {
        text: 'Generate',
        bgColor: 'bg-slate-100 hover:bg-blue-50',
        textColor: 'text-slate-600 hover:text-blue-700',
        borderColor: 'border-slate-200 hover:border-blue-200',
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        pulse: false
      };
    }

    switch (linkedInContent.processing_status) {
      case 'completed':
        return {
          text: 'Ready',
          bgColor: 'bg-emerald-50 hover:bg-emerald-100',
          textColor: 'text-emerald-700 hover:text-emerald-800',
          borderColor: 'border-emerald-200 hover:border-emerald-300',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          pulse: false
        };
      case 'processing':
        return {
          text: 'Processing',
          bgColor: 'bg-amber-50 hover:bg-amber-100',
          textColor: 'text-amber-700 hover:text-amber-800',
          borderColor: 'border-amber-200 hover:border-amber-300',
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          pulse: true
        };
      case 'failed':
        return {
          text: 'Failed',
          bgColor: 'bg-red-50 hover:bg-red-100',
          textColor: 'text-red-700 hover:text-red-800',
          borderColor: 'border-red-200 hover:border-red-300',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          pulse: false
        };
      default:
        return {
          text: 'Unknown',
          bgColor: 'bg-slate-100 hover:bg-slate-200',
          textColor: 'text-slate-600 hover:text-slate-700',
          borderColor: 'border-slate-200 hover:border-slate-300',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const title = linkedInContent 
    ? `LinkedIn content is ${config.text.toLowerCase()}. Click to view.`
    : 'Generate LinkedIn content for this article';

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium 
        border transition-all duration-200 
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${config.pulse ? 'animate-pulse' : ''}
        hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        transform hover:scale-105 active:scale-95
        ${className}
      `}
      title={title}
      type="button"
    >
      <span className="mr-1.5 flex items-center">
        {config.icon}
      </span>
      <span className="font-semibold tracking-wide">
        {config.text}
      </span>
      
      {linkedInContent && (
        <span className="ml-2 flex items-center">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </span>
      )}
    </button>
  );
} 