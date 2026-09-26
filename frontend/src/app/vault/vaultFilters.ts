import { VaultCategory, VaultItemContent } from '@myfinances/core/types';
import { VaultDecryptedItem, getCategoryDef } from './vaultTypes';

export const ALL_FILTER_VALUE = 'all';

const BANK_FIELD_BY_CATEGORY: Partial<Record<VaultCategory, string>> = {
  card: 'issuer',
  bank: 'bankName',
  insurance: 'provider',
};

const FILTERABLE_CATEGORIES: VaultCategory[] = ['card'];

export function isFilterableCategory(category: VaultCategory): boolean {
  return FILTERABLE_CATEGORIES.includes(category);
}

export function getBankName(category: VaultCategory, content: VaultItemContent): string {
  const fieldName = BANK_FIELD_BY_CATEGORY[category];
  if (!fieldName) return '';
  return (content.fields[fieldName] ?? '').trim();
}

export function getNetwork(category: VaultCategory, content: VaultItemContent): string {
  if (category !== 'card') return '';
  return (content.fields.network ?? '').trim();
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

export interface VaultFilterState {
  bank: string;
  network: string;
  owner: string;
}

export const EMPTY_VAULT_FILTERS: VaultFilterState = {
  bank: ALL_FILTER_VALUE,
  network: ALL_FILTER_VALUE,
  owner: ALL_FILTER_VALUE,
};

export interface VaultFilterOptions {
  banks: string[];
  networks: string[];
  owners: string[];
}

export const EMPTY_FILTER_OPTIONS: VaultFilterOptions = { banks: [], networks: [], owners: [] };

export function buildFilterOptions(
  items: VaultDecryptedItem[],
  ownerOf?: (item: VaultDecryptedItem) => string
): VaultFilterOptions {
  return {
    banks: sortedUnique(items.map((item) => getBankName(item.category, item.content))),
    networks: sortedUnique(items.map((item) => getNetwork(item.category, item.content))),
    owners: ownerOf ? sortedUnique(items.map(ownerOf)) : [],
  };
}

export function applyVaultFilters(
  items: VaultDecryptedItem[],
  filters: VaultFilterState,
  ownerOf?: (item: VaultDecryptedItem) => string
): VaultDecryptedItem[] {
  return items.filter((item) => {
    if (
      filters.bank !== ALL_FILTER_VALUE &&
      getBankName(item.category, item.content) !== filters.bank
    ) {
      return false;
    }
    if (
      filters.network !== ALL_FILTER_VALUE &&
      getNetwork(item.category, item.content) !== filters.network
    ) {
      return false;
    }
    if (filters.owner !== ALL_FILTER_VALUE && ownerOf && ownerOf(item) !== filters.owner) {
      return false;
    }
    return true;
  });
}

export function getBankFilterLabel(category: VaultCategory): string {
  const fieldName = BANK_FIELD_BY_CATEGORY[category];
  if (!fieldName) return 'Bank';
  return getCategoryDef(category).fields.find((field) => field.name === fieldName)?.label ?? 'Bank';
}
