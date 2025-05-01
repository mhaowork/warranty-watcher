'use client';

import { ManufacturerCredentials } from '../types/manufacturer';
import { PlatformCredentials } from '../types/platform';

// Simple getter/setter functions for manufacturer credentials
export function getManufacturerCredentials(): Partial<ManufacturerCredentials> {
  if (typeof window === 'undefined') return {};
  
  const stored = localStorage.getItem('manufacturer_credentials');
  return stored ? JSON.parse(stored) : {};
}

export function saveManufacturerCredentials(credentials: Partial<ManufacturerCredentials>) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('manufacturer_credentials', JSON.stringify(credentials));
}

// Simple getter/setter functions for platform credentials
export function getPlatformCredentials(): Partial<PlatformCredentials> {
  if (typeof window === 'undefined') return {};
  
  const stored = localStorage.getItem('platform_credentials');
  return stored ? JSON.parse(stored) : {};
}

export function savePlatformCredentials(credentials: Partial<PlatformCredentials>) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('platform_credentials', JSON.stringify(credentials));
} 