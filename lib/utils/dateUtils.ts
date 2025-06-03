// Shared date formatting utilities

// For detailed timestamps (last updated, created at, etc.) - shows relative time
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    // Handle future dates
    if (diffInMs < 0) {
      return 'In the future';
    }
    
    // Less than a minute
    if (diffInSeconds < 60) {
      return diffInSeconds <= 1 ? 'Just now' : `${diffInSeconds} seconds ago`;
    }
    
    // Less than an hour
    if (diffInMinutes < 60) {
      return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
    }
    
    // Less than a day
    if (diffInHours < 24) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    }
    
    // Less than a week
    if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    }
    
    // Less than a month (30 days)
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    
    // Less than a year
    if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    
    // Over a year
    const years = Math.floor(diffInDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
    
  } catch {
    return 'Invalid Date';
  }
}

// For warranty dates (start date, end date) - uses ISO format (YYYY-MM-DD)
export function formatWarrantyDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid';
    
    // Return ISO format (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch {
    return 'Invalid';
  }
}
