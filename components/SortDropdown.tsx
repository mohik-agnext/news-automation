import { SortOption } from '@/types/article';
import { sortOptions } from '@/lib/sorting';

interface SortDropdownProps {
  currentSort: SortOption['value'];
  onSortChange: (sortBy: SortOption['value']) => void;
  className?: string;
}

export default function SortDropdown({ currentSort, onSortChange, className = '' }: SortDropdownProps) {
  return (
    <div className={`relative z-50 ${className}`}>
      <label htmlFor="sort-select" className="sr-only">
        Sort articles by
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value as SortOption['value'])}
        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors duration-200 relative z-50"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none z-50">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}