import { Manufacturer } from '@/types/manufacturer';

/**
 * Determines the manufacturer enum based on a manufacturer name string
 * 
 * This function consolidates manufacturer detection logic used across
 * different platform integrations (N-central, Datto RMM, CSV import)
 * 
 * @param manufacturerName The manufacturer name string to analyze
 * @param defaultManufacturer The default manufacturer to return if no match is found (defaults to DELL)
 * @returns The corresponding Manufacturer enum value
 */
export function determineManufacturer(
  manufacturerName: string, 
  defaultManufacturer: Manufacturer = Manufacturer.DELL
): Manufacturer {
  // Handle empty or invalid input
  if (!manufacturerName || typeof manufacturerName !== 'string') {
    return defaultManufacturer;
  }

  const normalized = manufacturerName.toLowerCase().trim();

  // Dell detection
  if (normalized.includes('dell')) {
    return Manufacturer.DELL;
  }

  // HP detection (various forms)
  if (normalized.includes('hp') || 
      normalized.includes('hewlett') || 
      normalized.includes('packard')) {
    return Manufacturer.HP;
  }

  // Lenovo detection
  if (normalized.includes('lenovo') || 
      normalized.includes('thinkpad') ||
      normalized.includes('thinkcentre') ||
      normalized.includes('ideapad')) {
    return Manufacturer.LENOVO;
  }

  // Apple detection
  if (normalized.includes('apple') || 
      normalized.includes('mac') ||
      normalized.includes('macbook') ||
      normalized.includes('imac') ||
      normalized.includes('mac pro') ||
      normalized.includes('mac mini')) {
    return Manufacturer.APPLE;
  }

  // Microsoft detection
  if (normalized.includes('microsoft') || 
      normalized.includes('surface')) {
    return Manufacturer.MICROSOFT;
  }

  // Return default if no match found
  return defaultManufacturer;
}
