'use client';

interface OwnershipLegendProps {
  mineLabel: string;
  othersLabel: string;
  hasOthers: boolean;
}

export function OwnershipLegend({ mineLabel, othersLabel, hasOthers }: OwnershipLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        {mineLabel}
      </span>
      {hasOthers && (
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          {othersLabel}
        </span>
      )}
    </div>
  );
}
