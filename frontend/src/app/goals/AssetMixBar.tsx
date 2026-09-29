import { GOAL_ASSET_LABELS, type GoalValueByType } from '@myfinances/core/calc/goals';
import { cn } from '@/lib/utils';
import { ASSET_COLORS, GOAL_MIX_KEYS, formatCompactRupees } from './goalDisplay';

const PERCENT = 100;

export function AssetMixBar({
  byType,
  showLegend = true,
  className,
}: {
  byType: GoalValueByType;
  showLegend?: boolean;
  className?: string;
}) {
  const total = GOAL_MIX_KEYS.reduce((sum, key) => sum + byType[key], 0);
  const segments = GOAL_MIX_KEYS.filter((key) => byType[key] > 0).map((key) => ({
    key,
    label: GOAL_ASSET_LABELS[key],
    value: byType[key],
    share: total > 0 ? (byType[key] / total) * PERCENT : 0,
  }));

  if (segments.length === 0) {
    return (
      <div className={cn('space-y-1.5', className)}>
        <div className="h-1.5 w-full rounded-full bg-muted" />
        {showLegend && <p className="text-xs text-muted-foreground">No holdings linked yet</p>}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={segments
          .map((segment) => `${segment.label} ${Math.round(segment.share)}%`)
          .join(', ')}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="h-full"
            style={{ width: `${segment.share}%`, backgroundColor: ASSET_COLORS[segment.key] }}
            title={`${segment.label}: ${formatCompactRupees(segment.value)} (${Math.round(segment.share)}%)`}
          />
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {segments.map((segment) => (
            <span key={segment.key} className="inline-flex items-center gap-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: ASSET_COLORS[segment.key] }}
              />
              {segment.label} {Math.round(segment.share)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
