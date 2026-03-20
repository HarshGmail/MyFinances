'use client';

import { useEffect } from 'react';
import { API_BASE_URL } from '@/api/configs/baseUrl';

/**
 * Fire-and-forget ping to wake the backend on Render's free tier.
 * Renders nothing — drop this in any page that precedes an API call.
 */
export function BackendWarmup() {
  useEffect(() => {
    fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(() => {});
  }, []);

  return null;
}
