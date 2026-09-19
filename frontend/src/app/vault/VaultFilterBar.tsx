'use client';

import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_FILTER_VALUE, EMPTY_VAULT_FILTERS, VaultFilterState } from './vaultFilters';

interface FilterSelectProps {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}

function FilterSelect({ label, allLabel, value, options, onChange }: FilterSelectProps) {
  if (options.length < 2) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className="w-full sm:w-auto sm:min-w-[9rem]">
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface VaultFilterBarProps {
  filters: VaultFilterState;
  onChange: (next: VaultFilterState) => void;
  bankLabel: string;
  banks: string[];
  networks: string[];
  owners?: string[];
  matchCount: number;
  totalCount: number;
}

export function VaultFilterBar({
  filters,
  onChange,
  bankLabel,
  banks,
  networks,
  owners = [],
  matchCount,
  totalCount,
}: VaultFilterBarProps) {
  const hasAnyFilter = banks.length > 1 || networks.length > 1 || owners.length > 1;
  if (!hasAnyFilter) return null;

  const isFiltered =
    filters.bank !== ALL_FILTER_VALUE ||
    filters.network !== ALL_FILTER_VALUE ||
    filters.owner !== ALL_FILTER_VALUE;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <FilterSelect
        label={bankLabel}
        allLabel={`All ${bankLabel.toLowerCase()}s`}
        value={filters.bank}
        options={banks}
        onChange={(bank) => onChange({ ...filters, bank })}
      />
      <FilterSelect
        label="Network"
        allLabel="All networks"
        value={filters.network}
        options={networks}
        onChange={(network) => onChange({ ...filters, network })}
      />
      <FilterSelect
        label="Shared by"
        allLabel="Shared by anyone"
        value={filters.owner}
        options={owners}
        onChange={(owner) => onChange({ ...filters, owner })}
      />
      {isFiltered && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {matchCount} of {totalCount}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={() => onChange(EMPTY_VAULT_FILTERS)}
          >
            <FilterX className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
