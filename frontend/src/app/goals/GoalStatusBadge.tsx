import type { GoalStatus } from '@myfinances/core/calc/goals';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_META } from './goalDisplay';

export function GoalStatusBadge({ status, className }: { status: GoalStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', meta.badgeClassName, className)}>
      {meta.label}
    </Badge>
  );
}
