import type { MetadataRoute } from 'next';
import { PWA_THEME_COLOR_DARK } from '@/lib/pwa';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyFinance',
    short_name: 'MyFinance',
    description: 'Track investments, expenses and goals in one place',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: PWA_THEME_COLOR_DARK,
    theme_color: PWA_THEME_COLOR_DARK,
    categories: ['finance', 'productivity'],
    shortcuts: [
      { name: 'Vault', short_name: 'Vault', url: '/vault' },
      { name: 'Join a wallet', short_name: 'Join wallet', url: '/vault?tab=wallets&join=1' },
    ],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
