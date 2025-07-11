interface LoadingGridProps {
  count?: number;
}

export default function LoadingGrid({ count = 8 }: LoadingGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse"
        >
          {/* Score badge skeleton */}
          <div className="flex justify-between items-start mb-3">
            <div className="bg-gray-200 rounded-full h-6 w-16"></div>
            <div className="bg-gray-200 rounded-full h-6 w-6"></div>
          </div>
          
          {/* Title skeleton */}
          <div className="space-y-1.5 mb-3">
            <div className="bg-gray-200 rounded h-3.5 w-full"></div>
            <div className="bg-gray-200 rounded h-3.5 w-3/4"></div>
          </div>
          
          {/* Publisher and date skeleton */}
          <div className="flex justify-between items-center mb-3">
            <div className="bg-gray-200 rounded h-2.5 w-20"></div>
            <div className="bg-gray-200 rounded h-2.5 w-14"></div>
          </div>
          
          {/* Description skeleton */}
          <div className="space-y-1 mb-3">
            <div className="bg-gray-200 rounded h-2.5 w-full"></div>
            <div className="bg-gray-200 rounded h-2.5 w-5/6"></div>
            <div className="bg-gray-200 rounded h-2.5 w-4/6"></div>
          </div>
          
          {/* Tags skeleton */}
          <div className="flex gap-1 mb-3">
            <div className="bg-gray-200 rounded h-5 w-12"></div>
            <div className="bg-gray-200 rounded h-5 w-16"></div>
            <div className="bg-gray-200 rounded h-5 w-10"></div>
          </div>
          
          {/* Metadata skeleton */}
          <div className="flex gap-2 mb-3">
            <div className="bg-gray-200 rounded h-2.5 w-12"></div>
            <div className="bg-gray-200 rounded h-2.5 w-16"></div>
          </div>
          
          {/* Button skeleton */}
          <div className="bg-gray-200 rounded-md h-7 w-full"></div>
        </div>
      ))}
    </div>
  );
} 