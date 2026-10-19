import type { MetadataRoute } from 'next';

const SIGNED_IN_ONLY_PATHS = [
  '/home',
  '/today',
  '/stocks',
  '/mutual-funds',
  '/gold',
  '/crypto',
  '/epf',
  '/fd',
  '/rd',
  '/expenses',
  '/goals',
  '/profile',
  '/integrations',
  '/vault',
  '/popup',
  '/offline',
  '/reset-password',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: SIGNED_IN_ONLY_PATHS,
    },
    host: 'https://www.my-finances.site',
  };
}
