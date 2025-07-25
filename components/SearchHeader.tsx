'use client';

import { useState } from 'react';
import KeywordInput from './KeywordInput';

interface User {
  id: string;
  email: string;
}

interface SearchHeaderProps {
  onNewArticles?: () => void;
  onSearchComplete?: () => void;
  onShowBookmarks?: () => void;
  user?: User | null;
  onLogout?: () => void;
}

// Removed advanced search mode - only smart search available

export default function SearchHeader({ 
  onNewArticles,
  onSearchComplete,
  onShowBookmarks,
  user,
  onLogout
}: SearchHeaderProps) {
  const [searching, setSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState<string[]>([]);
  const [searchStatus, setSearchStatus] = useState<string>('');
  // Removed search mode toggle - always using smart search for SERP

  const handleSearch = async (keywords: string[]) => {
    setSearching(true);
    setLastSearch(keywords);
    setSearchStatus('Searching for articles...');
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          keywords
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSearchStatus(`Search completed! Found ${result.articlesFound} articles.`);
        
        // Notify parent component that search is complete
        if (onSearchComplete) {
          onSearchComplete();
        }
        
        // Auto-clear status after 3 seconds
        setTimeout(() => {
          setSearchStatus('');
        }, 3000);
      } else {
        const error = await response.json();
        setSearchStatus(`Search failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchStatus('Search failed: Network error');
    } finally {
      setSearching(false);
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/search', {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setLastSearch([]);
        setSearchStatus('All articles cleared');
        
        // Notify parent component
        if (onSearchComplete) {
          onSearchComplete();
        }
        
        // Auto-clear status after 2 seconds
        setTimeout(() => {
          setSearchStatus('');
        }, 2000);
      } else {
        setSearchStatus('Failed to clear articles');
      }
    } catch (error) {
      console.error('Clear error:', error);
      setSearchStatus('Failed to clear articles');
    }
  };

  // Simple display text for last search
  const lastSearchDisplayText = lastSearch.length > 0 ? lastSearch.join(' + ') : '';

  return (
    <div className="relative overflow-hidden">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-purple-600/5"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-400/10 to-transparent rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      
      <header className="relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar with Logo and Stats */}
          <div className="flex items-center justify-between py-8 border-b border-white/20 backdrop-blur-sm">
            <div className="flex items-center space-x-8">
              {/* Logo and Brand */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl opacity-20 blur"></div>
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                    News Intelligence
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">AI-Powered Agriculture News Discovery</p>
                </div>
              </div>
            </div>
            
            {/* Stats and Live Indicator */}
            <div className="flex items-center space-x-6">
              <div className="hidden sm:flex items-center space-x-6">
                {/* My Bookmarks Button */}
                <button
                  onClick={onShowBookmarks}
                  className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm hover:bg-white/95 hover:shadow-md transition-all duration-200 group"
                  title="View all your bookmarked articles"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-500 group-hover:text-red-600 transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-200">My Bookmarks</span>
                  </div>
                </button>
              </div>
              
              {/* User Info */}
              {user && (
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm hover:bg-white/95 transition-all duration-200">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-xs font-bold text-white">{user.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{user.email}</span>
                      <span className="text-sm font-semibold text-gray-700 sm:hidden">{user.email.split('@')[0]}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <button
                      onClick={onLogout}
                      className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600 transition-colors duration-200 px-2 py-1 rounded-md hover:bg-red-50"
                      title="Sign Out"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="hidden sm:inline font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Live Status - Removed RealtimeIndicator banner */}
            </div>
          </div>
          
          {/* Search Section */}
          <div className="py-12 lg:py-20">
            <div className="text-center mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Discover Agriculture Intelligence
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Search for cutting-edge insights on food quality, agriculture technology, and news services with AI-powered intelligence.
              </p>
            </div>
            
            {/* Search Input Container */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6 lg:p-8">
                <KeywordInput 
                  onSearch={handleSearch}
                  onClearAll={handleClearAll}
                  loading={searching}
                />
                
                {/* Search Status */}
                {(searchStatus || lastSearchDisplayText) && (
                  <div className="mt-6 text-center space-y-3">
                    {searchStatus && (
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                        searchStatus.includes('failed') || searchStatus.includes('error') 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : searchStatus.includes('completed')
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {searchStatus.includes('failed') || searchStatus.includes('error') ? (
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : searchStatus.includes('completed') ? (
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {searchStatus}
                      </div>
                    )}
                    
                    {lastSearchDisplayText && !searchStatus && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Last search:</span> {lastSearchDisplayText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
} 