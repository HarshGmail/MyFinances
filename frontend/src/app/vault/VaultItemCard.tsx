'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff, Pencil, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

function copyToClipboard(value: string, label: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error(`Could not copy ${label.toLowerCase()}`));
}

export function VaultItemCard({ item, onEdit, onDelete, onShare }: VaultItemCardProps) {
  const [revealedFields, setRevealedFields] = useState<string[]>([]);
  const definition = getCategoryDef(item.category);
  const CategoryIcon = definition.icon;
  const title = getItemTitle(item.category, item.content);
  const subtitle = getItemSubtitle(item.category, item.content);
  const fields = getPopulatedFields(item.category, item.content);

  const toggleReveal = (name: string) => {
    setRevealedFields((current) =>
      current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <CategoryIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{title}</div>
              {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
            </div>
          </div>
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
      <CardContent className="pt-0">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No details saved yet.</p>
        ) : (
          <div className="divide-y">
            {fields.map((field) => {
              const isRevealed = !field.secret || revealedFields.includes(field.name);
              const displayValue = isRevealed ? field.value : maskValue(field.value);
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
                      {displayValue}
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
        )}
      </CardContent>
    </Card>
  );
}
