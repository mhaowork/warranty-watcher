/**
 * Utility functions for warranty-related operations
 */

/**
 * Infers warranty status based on warranty end date
 * @param endDate Warranty end date in string format (YYYY-MM-DD)
 * @returns Warranty status: 'active', 'expired', or 'unknown'
 */
export function inferWarrantyStatus(endDate?: string): 'active' | 'expired' | 'unknown' {
  if (!endDate) return 'unknown';
  
  // Compare with current date
  const today = new Date();
  const warrantyEnd = new Date(endDate);
  
  // Check if the date is valid
  if (isNaN(warrantyEnd.getTime())) return 'unknown';
  
  return today <= warrantyEnd ? 'active' : 'expired';
} 