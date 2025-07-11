export function formatDaysAgo(publishedDaysAgo: number): string {
  if (publishedDaysAgo === 0) {
    return 'Today';
  } else if (publishedDaysAgo === 1) {
    return '1 day ago';
  } else if (publishedDaysAgo < 30) {
    return `${publishedDaysAgo} days ago`;
  } else if (publishedDaysAgo < 365) {
    const months = Math.floor(publishedDaysAgo / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(publishedDaysAgo / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
}

export function formatPublishedDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  return formatDaysAgo(diffInDays);
}

export function formatFullDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isRecentNews(publishedDaysAgo: number): boolean {
  return publishedDaysAgo <= 1; // Within last 24 hours
}

export function getTimeOfDay(publishedAt: string): string {
  const date = new Date(publishedAt);
  const hour = date.getHours();
  
  if (hour < 12) {
    return 'Morning';
  } else if (hour < 17) {
    return 'Afternoon';
  } else {
    return 'Evening';
  }
} 