import React from 'react';

export function MobileDataCard({
  title,
  headline,
  subline,
  columns = 3,
  children,
}: {
  title: React.ReactNode;
  headline?: React.ReactNode;
  subline?: React.ReactNode;
  columns?: 2 | 3;
  children: React.ReactNode;
}) {
  const gridColumns = columns === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-sm min-w-0 truncate">{title}</div>
        {(headline || subline) && (
          <div className="text-right shrink-0">
            {headline && <div className="text-sm font-semibold">{headline}</div>}
            {subline && <div className="text-xs">{subline}</div>}
          </div>
        )}
      </div>
      <div className={`grid ${gridColumns} gap-x-3 gap-y-2 mt-3`}>{children}</div>
    </div>
  );
}

export function MobileDataMetric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm truncate">{children}</div>
    </div>
  );
}
