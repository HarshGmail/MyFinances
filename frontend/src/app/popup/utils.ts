import { PiPPreferences } from './types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const savePreferencesToStorage = (preferences: PiPPreferences) => {
  localStorage.setItem('pipPreferences', JSON.stringify(preferences));
};

export const loadPreferencesFromStorage = (): PiPPreferences | null => {
  try {
    const saved = localStorage.getItem('pipPreferences');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to parse saved preferences:', error);
  }
  return null;
};
