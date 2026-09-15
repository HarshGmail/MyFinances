export const PWA_THEME_COLOR_LIGHT = '#ffffff';
export const PWA_THEME_COLOR_DARK = '#0a0a0a';

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone === true;
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || isIpadOs;
}
