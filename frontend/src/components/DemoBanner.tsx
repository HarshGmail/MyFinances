'use client';

import Link from 'next/link';
import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  const user = useAppStore((state) => state.user);

  if (!user?.isDemo || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-900">
          You're viewing <strong>demo data</strong>. Changes are disabled for this account.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/"
          className="text-sm font-medium text-amber-700 hover:text-amber-900 underline transition-colors"
        >
          Sign Up Free
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-100 rounded-md transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4 text-amber-600" />
        </button>
      </div>
    </div>
  );
}
