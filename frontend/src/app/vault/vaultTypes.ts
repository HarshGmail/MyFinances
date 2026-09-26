import { CreditCard, KeyRound, Landmark, ShieldCheck, Wallet, LucideIcon } from 'lucide-react';
import { VaultCategory } from '@myfinances/core/types';
import {
  VAULT_CATEGORIES as CORE_VAULT_CATEGORIES,
  VaultCategoryDef as CoreVaultCategoryDef,
  WALLETS_TAB as CORE_WALLETS_TAB,
} from '@myfinances/core/vault/vaultTypes';

export * from '@myfinances/core/vault/vaultTypes';

const CATEGORY_ICONS: Record<VaultCategory, LucideIcon> = {
  bank: Landmark,
  card: CreditCard,
  insurance: ShieldCheck,
  other: KeyRound,
};

export interface VaultCategoryDef extends CoreVaultCategoryDef {
  icon: LucideIcon;
}

export const VAULT_CATEGORIES: VaultCategoryDef[] = CORE_VAULT_CATEGORIES.map((category) => ({
  ...category,
  icon: CATEGORY_ICONS[category.id],
}));

export function getCategoryDef(id: VaultCategory): VaultCategoryDef {
  return VAULT_CATEGORIES.find((category) => category.id === id) ?? VAULT_CATEGORIES[0];
}

export const WALLETS_TAB = { ...CORE_WALLETS_TAB, icon: Wallet } as const;

export const VAULT_FACE_GRID_CLASS =
  'grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(19rem,1fr))]';
