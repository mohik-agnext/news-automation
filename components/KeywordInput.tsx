'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface KeywordInputProps {
  onSearch: (keywords: string[]) => void;
  onClearAll?: () => void;
  loading?: boolean;
  placeholder?: string;
}

export default function KeywordInput({ 
  onSearch, 
  onClearAll, 
  loading = false, 
  placeholder
}: KeywordInputProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Static predefined keywords for AgNext agriculture domain
  const predefinedKeywords = [
    'agriculture technology', 'food safety', 'crop monitoring', 'quality testing',
    'precision farming', 'food processing', 'agriculture innovation', 'farm management',
    'food quality control', 'agriculture automation', 'smart farming', 'crop analysis',
    'agriculture sensors', 'food inspection', 'agriculture AI', 'food security',
    'agriculture sustainability', 'post-harvest technology', 'food standards',
    'agriculture digitalization', 'food traceability', 'agriculture solutions'
  ];

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return "Enter keywords like 'food safety', 'agriculture technology'...";
  };

  // Generate contextual suggestions based on input
  const generateSuggestions = useCallback((inputValue: string) => {
    if (!inputValue || inputValue.length < 2) {
      console.log('🔍 Input too short for suggestions:', inputValue);
      return [];
    }

    const lowercaseInput = inputValue.toLowerCase();
    
    // Filter predefined keywords that match the input
    const matchingKeywords = predefinedKeywords.filter(keyword => {
      const isMatch = keyword.toLowerCase().includes(lowercaseInput);
      const notAlreadySelected = !selectedKeywords.includes(keyword);
      return isMatch && notAlreadySelected;
    });

    console.log('🎯 Generated suggestions for "' + inputValue + '":', matchingKeywords);
    return matchingKeywords.slice(0, 8); // Limit to 8 suggestions
  }, [selectedKeywords]);

  // Handle input changes and generate suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('✏️ Input changed:', value);
    setInput(value);

    if (value.length >= 2) {
      const newSuggestions = generateSuggestions(value);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    console.log('🎯 Input focused');
    if (input.length >= 2) {
      const newSuggestions = generateSuggestions(input);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    }
  };

  // Handle input blur
  const handleInputBlur = (e: React.FocusEvent) => {
    // Don't close suggestions immediately - let click handlers work first
    setTimeout(() => {
      console.log('👁️ Input blurred, hiding suggestions');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Add keyword to selection
  const addKeyword = (keyword: string) => {
    if (!selectedKeywords.includes(keyword)) {
      const newKeywords = [...selectedKeywords, keyword];
      console.log('➕ Added keyword:', keyword, 'New list:', newKeywords);
      setSelectedKeywords(newKeywords);
      setInput('');
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      
      // Focus back to input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Remove keyword from selection
  const removeKeyword = (keywordToRemove: string) => {
    const newKeywords = selectedKeywords.filter(k => k !== keywordToRemove);
    console.log('➖ Removed keyword:', keywordToRemove, 'New list:', newKeywords);
    setSelectedKeywords(newKeywords);
  };

  // Select suggestion from dropdown
  const selectSuggestion = (suggestion: string) => {
    console.log('🎯 Selected suggestion:', suggestion);
    addKeyword(suggestion);
  };

  // Handle adding keyword from input (Enter or comma)
  const handleInputKeyword = () => {
    const trimmedInput = input.trim();
    if (trimmedInput && !selectedKeywords.includes(trimmedInput)) {
      addKeyword(trimmedInput);
    } else if (trimmedInput) {
      setInput('');
      setShowSuggestions(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle comma separation
    if (e.key === ',') {
      e.preventDefault();
      handleInputKeyword();
      return;
    }

    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (input.trim()) {
          handleInputKeyword();
        } else if (selectedKeywords.length > 0) {
          handleSearch();
        }
      }
      // Handle backspace to remove last keyword when input is empty
      if (e.key === 'Backspace' && input === '' && selectedKeywords.length > 0) {
        const newKeywords = selectedKeywords.slice(0, -1);
        setSelectedKeywords(newKeywords);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        } else if (input.trim()) {
          handleInputKeyword();
        } else if (selectedKeywords.length > 0) {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Search function
  const handleSearch = () => {
    if (selectedKeywords.length > 0) {
      onSearch(selectedKeywords);
    } else if (input.trim()) {
      // If no keywords selected but has input, use the input
      onSearch([input.trim()]);
      setInput('');
    }
  };

  // Clear all function
  const handleClearAll = () => {
    setSelectedKeywords([]);
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onClearAll) {
      onClearAll();
    }
  };

  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const containerRect = inputRef.current.closest('.max-w-4xl')?.getBoundingClientRect();
      
      if (containerRect) {
        setDropdownPosition({
          top: rect.bottom - containerRect.top + 8,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height
        });
        console.log('🎨 Dropdown position:', { 
          top: rect.bottom - containerRect.top + 8, 
          left: rect.left - containerRect.left, 
          width: rect.width, 
          height: rect.height 
        });
      }
    }
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inputElement = inputRef.current;
      const suggestionsElement = suggestionsRef.current;
      
      // Check if click is outside both input and suggestions
      if (inputElement && suggestionsElement) {
        const clickedOutside = !inputElement.contains(target) && !suggestionsElement.contains(target);
        
        if (clickedOutside) {
          console.log('🖱️ Click outside detected, closing suggestions');
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle window resize and scroll to update position
  useEffect(() => {
    const handlePositionUpdate = () => {
      updateDropdownPosition();
    };

    window.addEventListener('resize', handlePositionUpdate);
    window.addEventListener('scroll', handlePositionUpdate, true);

    return () => {
      window.removeEventListener('resize', handlePositionUpdate);
      window.removeEventListener('scroll', handlePositionUpdate, true);
    };
  }, [updateDropdownPosition]);

  // Update position when suggestions become visible
  useEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition();
    }
  }, [showSuggestions, updateDropdownPosition]);

  console.log('🎨 Dropdown render check: showSuggestions=' + showSuggestions + ', suggestions.length=' + suggestions.length + ', suggestions=', suggestions);

  return (
    <div className="relative w-full">
      {/* Selected Keywords */}
      {selectedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          {selectedKeywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white shadow-sm"
            >
              {keyword}
              <button
                onClick={() => removeKeyword(keyword)}
                className="ml-2 text-blue-200 hover:text-white transition-colors duration-200"
                aria-label={`Remove ${keyword}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={getPlaceholder()}
              disabled={loading}
              className="block w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/95 backdrop-blur-sm shadow-sm placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            />
          </div>
          
          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || (selectedKeywords.length === 0 && input.trim() === '')}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Searching...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </div>
            )}
          </button>
          
          {/* Clear All Button */}
          {(selectedKeywords.length > 0 || input.trim()) && (
            <button
              onClick={handleClearAll}
              className="px-4 py-4 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-300 hover:border-red-300 transition-all duration-200"
              title="Clear all keywords"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-2 max-h-64 overflow-y-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width
            }}
          >
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150 flex items-center space-x-3 ${
                    index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="flex-1">{suggestion}</span>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Helpful hints */}
      <div className="mt-4 text-sm text-gray-500 space-y-1">
        <p>💡 <strong>Tips:</strong> Use keywords like "food safety", "agriculture technology", or "crop monitoring"</p>
        <p>⌨️ <strong>Quick input:</strong> Type and press Enter to add keywords, then Search to find articles</p>
      </div>
    </div>
  );
} 