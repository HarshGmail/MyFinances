import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function RefreshIndicator({
  isRefreshing,
  lastUpdatedAt,
}: {
  isRefreshing: boolean;
  lastUpdatedAt: number | null;
}) {
  if (isRefreshing) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
        title="Fetching the latest prices"
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Refreshing…</span>
      </span>
    );
  }

  if (lastUpdatedAt === null) return null;

  return (
    <span
      className="text-xs text-muted-foreground"
      title={format(lastUpdatedAt, "d MMM yyyy 'at' h:mm a")}
    >
      as of {format(lastUpdatedAt, 'h:mm a')}
    </span>
  );
}
