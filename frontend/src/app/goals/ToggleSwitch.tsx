import { cn } from '@/lib/utils';

export function ToggleSwitch({
  checked,
  onCheckedChange,
  id,
  ...ariaProps
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        checked ? 'bg-primary' : 'bg-input'
      )}
      {...ariaProps}
    >
      <span
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}
