'use client';

import { useState } from 'react';
import { ChevronDown, Copy, Eye, EyeOff, Pencil, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardFace } from './CardFace';
import { PassbookFace } from './PassbookFace';
import {
  VaultDecryptedItem,
  buildItemCopyText,
  getCategoryDef,
  getItemSubtitle,
  getItemTitle,
  getPopulatedFields,
  maskValue,
} from './vaultTypes';

interface VaultItemCardProps {
  item: VaultDecryptedItem;
  onEdit: (item: VaultDecryptedItem) => void;
  onDelete: (item: VaultDecryptedItem) => void;
  onShare?: (item: VaultDecryptedItem) => void;
}

const FACE_CATEGORIES = ['card', 'bank'];
const FACE_SECRET_FIELD: Record<string, string> = {
  card: 'cardNumber',
  bank: 'accountNumber',
};

function copyToClipboard(value: string, label: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error(`Could not copy ${label.toLowerCase()}`));
}

export function VaultItemCard({ item, onEdit, onDelete, onShare }: VaultItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [revealedFields, setRevealedFields] = useState<string[]>([]);
  const definition = getCategoryDef(item.category);
  const CategoryIcon = definition.icon;
  const title = getItemTitle(item.category, item.content);
  const subtitle = getItemSubtitle(item.category, item.content);
  const fields = getPopulatedFields(item.category, item.content);
  const hasFace = FACE_CATEGORIES.includes(item.category);

  const toggleReveal = (name: string) => {
    setRevealedFields((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name]
    );
  };

  const detailRows = (
    <div className="divide-y">
      {fields.map((field) => {
        const isRevealed = !field.secret || revealedFields.includes(field.name);
        const shownValue = isRevealed ? field.displayValue : maskValue(field.value);
        return (
          <div
            key={field.name}
            className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">
              {field.label}
            </span>
            <div className="flex items-center gap-1 min-w-0 sm:justify-end">
              <button
                type="button"
                title={`Copy ${field.label.toLowerCase()}`}
                onClick={() => copyToClipboard(field.value, field.label)}
                className={`min-w-0 rounded px-1.5 py-0.5 text-left text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  field.multiline ? 'whitespace-pre-wrap break-words' : 'truncate font-mono'
                }`}
              >
                {shownValue}
              </button>
              {field.secret && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                  title={isRevealed ? 'Hide' : 'Reveal'}
                  onClick={() => toggleReveal(field.name)}
                >
                  {isRevealed ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (hasFace) {
    const secretFieldName = FACE_SECRET_FIELD[item.category];
    const hasSecretValue = Boolean((item.content.fields[secretFieldName] ?? '').trim());
    const isNumberRevealed = revealedFields.includes(secretFieldName);
    const Face = item.category === 'card' ? CardFace : PassbookFace;

    const faceActions = (
      <>
        {hasSecretValue && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/80 hover:bg-white/15 hover:text-white"
            title={isNumberRevealed ? 'Hide number' : 'Reveal number'}
            onClick={(event) => {
              event.stopPropagation();
              toggleReveal(secretFieldName);
            }}
          >
            {isNumberRevealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-white/80 hover:bg-white/15 hover:text-white"
          title="Copy all details"
          onClick={(event) => {
            event.stopPropagation();
            copyToClipboard(buildItemCopyText(item.category, item.content), title);
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        {onShare && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/80 hover:bg-white/15 hover:text-white"
            title="Share to a wallet"
            onClick={(event) => {
              event.stopPropagation();
              onShare(item);
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-white/80 hover:bg-white/15 hover:text-white"
          title="Edit"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(item);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-white/80 hover:bg-red-500/30 hover:text-white"
          title="Delete"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(item);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </>
    );

    return (
      <div className="space-y-2">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsExpanded((current) => !current);
            }
          }}
          className="w-full max-w-[21rem] cursor-pointer rounded-xl transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.99] sm:hover:-translate-y-0.5"
        >
          <Face content={item.content} isNumberRevealed={isNumberRevealed} actions={faceActions} />
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
          {isExpanded ? 'Hide details' : 'Show all details'}
        </button>

        {isExpanded && (
          <Card className="max-w-[42rem]">
            <CardContent className="py-2">{detailRows}</CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
            className="flex items-start gap-3 min-w-0 rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{title}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
              {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              title="Copy all details"
              onClick={() => copyToClipboard(buildItemCopyText(item.category, item.content), title)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {onShare && (
              <Button
                size="sm"
                variant="ghost"
                title="Share to a wallet"
                onClick={() => onShare(item)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" title="Edit" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Delete"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No details saved yet.</p>
          ) : (
            detailRows
          )}
        </CardContent>
      )}
    </Card>
  );
}
