import { toast } from 'sonner';
import { configureApi } from '@myfinances/core/api/client';
import { clearQueryCache } from '@/lib/queryPersister';
import { API_BASE_URL } from './baseUrl';

configureApi({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  onDemoBlocked: () => toast.error('Demo data is read-only'),
  onUnauthorized: () => {
    clearQueryCache().finally(() => {
      localStorage.removeItem('user');
      window.location.assign('/');
    });
  },
  onLoggedOut: clearQueryCache,
});
