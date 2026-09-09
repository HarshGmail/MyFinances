'use client';

import { VaultCategory } from '@/api/dataInterface';
import { Badge } from '@/components/ui/badge';
import { VAULT_CATEGORIES } from './vaultTypes';

interface CategoryRailProps {
  selected: VaultCategory;
  onSelect: (category: VaultCategory) => void;
  counts: Record<string, number>;
}

export function CategoryRail({ selected, onSelect, counts }: CategoryRailProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
      {VAULT_CATEGORIES.map(({ id, label, icon: Icon, description }) => {
        const isSelected = selected === id;
        const count = counts[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`shrink-0 rounded-lg border p-3 text-left transition-colors md:w-full ${
              isSelected
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-between gap-2 md:mb-1">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              </div>
              {count > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {count}
                </Badge>
              )}
            </div>
            <p className="hidden md:block text-xs text-muted-foreground leading-tight">
              {description}
            </p>
          </button>
        );
      })}
    </nav>
  );
}
