import { CreditCard, KeyRound, Landmark, ShieldCheck, Wallet, LucideIcon } from 'lucide-react';
import { VaultCategory, VaultCustomField, VaultItemContent } from '@myfinances/core/types';

export interface VaultDecryptedItem {
  id: string;
  category: VaultCategory;
  content: VaultItemContent;
  createdAt: string;
  updatedAt: string;
}

export type VaultFieldFormat = 'cardNumber' | 'expiry';

export interface VaultFieldDef {
  name: string;
  label: string;
  secret?: boolean;
  multiline?: boolean;
  placeholder?: string;
  shareByDefault?: boolean;
  derived?: boolean;
  format?: VaultFieldFormat;
  suggestions?: string[];
}

export interface VaultCategoryDef {
  id: VaultCategory;
  label: string;
  singular: string;
  icon: LucideIcon;
  description: string;
  titleField: string;
  subtitleField?: string;
  fields: VaultFieldDef[];
}

const BANK_FIELDS: VaultFieldDef[] = [
  { name: 'bankName', label: 'Bank Name', placeholder: 'HDFC Bank', shareByDefault: true },
  { name: 'accountHolder', label: 'Account Holder', shareByDefault: true },
  { name: 'accountNumber', label: 'Account Number', secret: true },
  { name: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0000123', shareByDefault: true },
  { name: 'branch', label: 'Branch', shareByDefault: true },
  { name: 'accountType', label: 'Account Type', placeholder: 'Savings', shareByDefault: true },
  { name: 'customerId', label: 'Customer ID', secret: true },
  { name: 'upiIds', label: 'UPI IDs', placeholder: 'name@okhdfcbank', shareByDefault: true },
  { name: 'netBankingUsername', label: 'Net Banking Username', secret: true },
  { name: 'netBankingPassword', label: 'Net Banking Password', secret: true },
  { name: 'nomineeName', label: 'Nominee Name' },
  { name: 'nomineeRelation', label: 'Nominee Relation' },
  { name: 'nomineeDob', label: 'Nominee Date of Birth' },
  { name: 'remarks', label: 'Remarks', multiline: true, shareByDefault: true },
];

export const CARD_TYPES = ['Credit', 'Debit', 'Prepaid', 'Forex'];
export const CARD_NETWORKS = ['Visa', 'Mastercard', 'RuPay', 'American Express', 'Diners Club'];

const CARD_FIELDS: VaultFieldDef[] = [
  { name: 'issuer', label: 'Issuer', placeholder: 'HDFC Bank', shareByDefault: true },
  {
    name: 'cardType',
    label: 'Card Type',
    placeholder: 'Credit / Debit',
    shareByDefault: true,
    suggestions: CARD_TYPES,
  },
  {
    name: 'network',
    label: 'Network',
    placeholder: 'Visa / Mastercard / RuPay',
    shareByDefault: true,
    suggestions: CARD_NETWORKS,
  },
  { name: 'cardLabel', label: 'Card Name', placeholder: 'Millennia', shareByDefault: true },
  { name: 'nameOnCard', label: 'Name on Card', shareByDefault: true },
  {
    name: 'cardNumber',
    label: 'Card Number',
    secret: true,
    format: 'cardNumber',
    placeholder: '1234 5678 9012 3456',
  },
  {
    name: 'lastFour',
    label: 'Last 4 Digits',
    placeholder: '4821',
    shareByDefault: true,
    derived: true,
  },
  { name: 'expiry', label: 'Expiry', placeholder: 'MM/YY', shareByDefault: true, format: 'expiry' },
  { name: 'cvv', label: 'CVV', secret: true },
  { name: 'atmPin', label: 'ATM PIN', secret: true },
  { name: 'creditLimit', label: 'Credit Limit' },
  { name: 'billingDate', label: 'Statement Date' },
  { name: 'dueDate', label: 'Payment Due Date' },
  { name: 'netBankingUsername', label: 'Net Banking Username', secret: true },
  { name: 'netBankingPassword', label: 'Net Banking Password', secret: true },
  {
    name: 'offerNotes',
    label: 'Offers & Discounts',
    placeholder: '10% on Swiggy, 5% on Amazon',
    multiline: true,
    shareByDefault: true,
  },
  { name: 'remarks', label: 'Remarks', multiline: true, shareByDefault: true },
];

const INSURANCE_FIELDS: VaultFieldDef[] = [
  { name: 'policyName', label: 'Policy Name', shareByDefault: true },
  { name: 'provider', label: 'Provider', placeholder: 'LIC / HDFC Ergo', shareByDefault: true },
  { name: 'policyNumber', label: 'Policy Number', secret: true },
  {
    name: 'policyType',
    label: 'Type',
    placeholder: 'Term / Health / Vehicle',
    shareByDefault: true,
  },
  { name: 'sumAssured', label: 'Sum Assured' },
  { name: 'premiumAmount', label: 'Premium Amount' },
  { name: 'premiumFrequency', label: 'Premium Frequency', placeholder: 'Yearly' },
  { name: 'startDate', label: 'Start Date' },
  { name: 'maturityDate', label: 'Maturity Date' },
  { name: 'nextDueDate', label: 'Next Due Date' },
  { name: 'nomineeName', label: 'Nominee Name' },
  { name: 'nomineeRelation', label: 'Nominee Relation' },
  { name: 'agentName', label: 'Agent Name', shareByDefault: true },
  { name: 'agentContact', label: 'Agent Contact', shareByDefault: true },
  { name: 'remarks', label: 'Remarks', multiline: true, shareByDefault: true },
];

const OTHER_FIELDS: VaultFieldDef[] = [
  { name: 'label', label: 'Name', placeholder: 'Income Tax Portal', shareByDefault: true },
  { name: 'url', label: 'Website', placeholder: 'https://…', shareByDefault: true },
  { name: 'username', label: 'Username', secret: true },
  { name: 'password', label: 'Password', secret: true },
  { name: 'remarks', label: 'Remarks', multiline: true, shareByDefault: true },
];

export const VAULT_CATEGORIES: VaultCategoryDef[] = [
  {
    id: 'bank',
    label: 'Bank Details',
    singular: 'Bank Account',
    icon: Landmark,
    description: 'Accounts, IFSC codes, net banking and nominees',
    titleField: 'bankName',
    subtitleField: 'accountType',
    fields: BANK_FIELDS,
  },
  {
    id: 'card',
    label: 'Cards',
    singular: 'Card',
    icon: CreditCard,
    description: 'Credit and debit cards, their PINs and the offers each one carries',
    titleField: 'issuer',
    subtitleField: 'cardLabel',
    fields: CARD_FIELDS,
  },
  {
    id: 'insurance',
    label: 'Insurance',
    singular: 'Policy',
    icon: ShieldCheck,
    description: 'Policy numbers, premiums, maturity dates and nominees',
    titleField: 'policyName',
    subtitleField: 'provider',
    fields: INSURANCE_FIELDS,
  },
  {
    id: 'other',
    label: 'Others',
    singular: 'Entry',
    icon: KeyRound,
    description: 'Logins and anything else worth keeping locked away',
    titleField: 'label',
    subtitleField: 'url',
    fields: OTHER_FIELDS,
  },
];

export const VAULT_CATEGORY_IDS = VAULT_CATEGORIES.map((category) => category.id);

const FACE_CATEGORIES: VaultCategory[] = ['card', 'bank'];

export function hasCardFace(category: VaultCategory): boolean {
  return FACE_CATEGORIES.includes(category);
}

export const VAULT_FACE_GRID_CLASS =
  'grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(19rem,1fr))]';

export const WALLETS_TAB_ID = 'wallets';

export type VaultTabId = VaultCategory | typeof WALLETS_TAB_ID;

export const VAULT_TAB_IDS: VaultTabId[] = [...VAULT_CATEGORY_IDS, WALLETS_TAB_ID];

export const WALLETS_TAB = {
  id: WALLETS_TAB_ID,
  label: 'Wallets',
  icon: Wallet,
  description: 'Entries you pool and share with friends',
} as const;

export function getCategoryDef(id: VaultCategory): VaultCategoryDef {
  return VAULT_CATEGORIES.find((category) => category.id === id) ?? VAULT_CATEGORIES[0];
}

export function emptyContentFor(category: VaultCategory): VaultItemContent {
  const fields: Record<string, string> = {};
  for (const field of getCategoryDef(category).fields) fields[field.name] = '';
  return { fields, customFields: [] };
}

export function getItemTitle(category: VaultCategory, content: VaultItemContent): string {
  const definition = getCategoryDef(category);
  return content.fields[definition.titleField]?.trim() || `Untitled ${definition.singular}`;
}

export function getItemSubtitle(category: VaultCategory, content: VaultItemContent): string {
  const definition = getCategoryDef(category);
  if (!definition.subtitleField) return '';
  return content.fields[definition.subtitleField]?.trim() ?? '';
}

const MASK_CHARACTER = '•';
const REVEALED_TAIL_LENGTH = 4;
const MAX_MASK_LENGTH = 12;

export function maskValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= REVEALED_TAIL_LENGTH) {
    return MASK_CHARACTER.repeat(trimmed.length);
  }
  const hiddenLength = Math.min(trimmed.length - REVEALED_TAIL_LENGTH, MAX_MASK_LENGTH);
  return `${MASK_CHARACTER.repeat(hiddenLength)} ${trimmed.slice(-REVEALED_TAIL_LENGTH)}`;
}

const CARD_NUMBER_GROUP_SIZE = 4;
const CARD_NUMBER_MAX_DIGITS = 19;
const EXPIRY_DIGITS = 4;
const LAST_FOUR_LENGTH = 4;

export function formatCardNumberInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, CARD_NUMBER_MAX_DIGITS);
  return digits.replace(new RegExp(`(.{${CARD_NUMBER_GROUP_SIZE}})`, 'g'), '$1 ').trim();
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, EXPIRY_DIGITS);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function formatVaultFieldInput(format: VaultFieldFormat, value: string): string {
  return format === 'cardNumber' ? formatCardNumberInput(value) : formatExpiryInput(value);
}

export function deriveLastFour(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '').slice(-LAST_FOUR_LENGTH);
}

export function applyDerivedFields(
  category: VaultCategory,
  content: VaultItemContent
): VaultItemContent {
  if (category !== 'card') return content;
  const lastFour = deriveLastFour(content.fields.cardNumber ?? '');
  if (!lastFour) return content;
  return { ...content, fields: { ...content.fields, lastFour } };
}

export interface VaultCardFace {
  issuer: string;
  cardLabel: string;
  network: string;
  cardType: string;
  nameOnCard: string;
  expiry: string;
  maskedNumber: string;
  fullNumber: string;
}

export function getCardFace(content: VaultItemContent): VaultCardFace {
  const fields = content.fields;
  const fullNumber = (fields.cardNumber ?? '').trim();
  const lastFour = deriveLastFour(fullNumber) || (fields.lastFour ?? '').trim();
  return {
    issuer: (fields.issuer ?? '').trim(),
    cardLabel: (fields.cardLabel ?? '').trim(),
    network: (fields.network ?? '').trim(),
    cardType: (fields.cardType ?? '').trim(),
    nameOnCard: (fields.nameOnCard ?? '').trim(),
    expiry: (fields.expiry ?? '').trim(),
    maskedNumber: lastFour ? `•••• •••• •••• ${lastFour}` : '•••• •••• •••• ••••',
    fullNumber: fullNumber ? formatCardNumberInput(fullNumber) : '',
  };
}

export interface VaultDisplayField {
  name: string;
  label: string;
  value: string;
  displayValue: string;
  secret: boolean;
  multiline: boolean;
}

export function getPopulatedFields(
  category: VaultCategory,
  content: VaultItemContent
): VaultDisplayField[] {
  const definition = getCategoryDef(category);
  const standard = definition.fields
    .filter((field) => !field.derived && (content.fields[field.name] ?? '').trim().length > 0)
    .map((field) => {
      const value = content.fields[field.name].trim();
      return {
        name: field.name,
        label: field.label,
        value,
        displayValue: field.format ? formatVaultFieldInput(field.format, value) : value,
        secret: Boolean(field.secret),
        multiline: Boolean(field.multiline),
      };
    });

  const custom = content.customFields
    .filter((field) => field.label.trim().length > 0 && field.value.trim().length > 0)
    .map((field) => ({
      name: `custom:${field.label}`,
      label: field.label.trim(),
      value: field.value.trim(),
      displayValue: field.value.trim(),
      secret: field.secret,
      multiline: false,
    }));

  return [...standard, ...custom];
}

export interface VaultShareableField {
  name: string;
  label: string;
  value: string;
  secret: boolean;
  isCustom: boolean;
  shareByDefault: boolean;
}

export function getShareableFields(
  category: VaultCategory,
  content: VaultItemContent
): VaultShareableField[] {
  const definition = getCategoryDef(category);
  const standard = definition.fields
    .filter((field) => (content.fields[field.name] ?? '').trim().length > 0)
    .map((field) => ({
      name: field.name,
      label: field.label,
      value: content.fields[field.name].trim(),
      secret: Boolean(field.secret),
      isCustom: false,
      shareByDefault: Boolean(field.shareByDefault),
    }));

  const custom = content.customFields
    .filter((field) => field.label.trim().length > 0 && field.value.trim().length > 0)
    .map((field) => ({
      name: `custom:${field.label.trim()}`,
      label: field.label.trim(),
      value: field.value.trim(),
      secret: field.secret,
      isCustom: true,
      shareByDefault: !field.secret,
    }));

  return [...standard, ...custom];
}

export function buildSharedProjection(
  category: VaultCategory,
  content: VaultItemContent,
  selectedNames: string[]
): VaultItemContent {
  const selected = new Set(selectedNames);
  const fields: Record<string, string> = {};
  const customFields: VaultCustomField[] = [];

  for (const field of getShareableFields(category, content)) {
    if (!selected.has(field.name)) continue;
    if (field.isCustom) {
      customFields.push({ label: field.label, value: field.value, secret: field.secret });
    } else {
      fields[field.name] = field.value;
    }
  }

  return { fields, customFields };
}

export function buildItemCopyText(category: VaultCategory, content: VaultItemContent): string {
  const heading = [getItemTitle(category, content), getItemSubtitle(category, content)]
    .filter(Boolean)
    .join(' — ');
  const lines = getPopulatedFields(category, content).map(
    (field) => `${field.label}: ${field.displayValue}`
  );
  return [heading, ...lines].join('\n');
}
