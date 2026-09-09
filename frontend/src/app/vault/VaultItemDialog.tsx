'use client';

import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { VaultCategory } from '@/api/dataInterface';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCategoryDef } from './vaultTypes';

export interface VaultItemFormValues {
  fields: Record<string, string>;
  customFields: { label: string; value: string; secret: boolean }[];
}

interface VaultItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: VaultCategory;
  isEditing: boolean;
  form: UseFormReturn<VaultItemFormValues>;
  onSubmit: (values: VaultItemFormValues) => Promise<void>;
  isPending: boolean;
}

export function VaultItemDialog({
  open,
  onOpenChange,
  category,
  isEditing,
  form,
  onSubmit,
  isPending,
}: VaultItemDialogProps) {
  const definition = getCategoryDef(category);
  const {
    fields: customFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: 'customFields',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${definition.singular}` : `Add ${definition.singular}`}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4 py-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {definition.fields.map((field) => (
              <div
                key={field.name}
                className={`space-y-1.5 ${field.multiline ? 'sm:col-span-2' : ''}`}
              >
                <Label htmlFor={`vault-${field.name}`}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    id={`vault-${field.name}`}
                    rows={2}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    {...form.register(`fields.${field.name}` as const)}
                  />
                ) : (
                  <Input
                    id={`vault-${field.name}`}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    {...form.register(`fields.${field.name}` as const)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Custom fields</div>
                <p className="text-xs text-muted-foreground">
                  Anything this category does not already cover
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => append({ label: '', value: '', secret: false })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom fields yet.</p>
            ) : (
              <div className="space-y-2">
                {customFields.map((customField, index) => (
                  <div
                    key={customField.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    <Input
                      placeholder="Label"
                      autoComplete="off"
                      className="sm:w-1/3"
                      {...form.register(`customFields.${index}.label` as const)}
                    />
                    <Input
                      placeholder="Value"
                      autoComplete="off"
                      className="sm:flex-1"
                      {...form.register(`customFields.${index}.value` as const)}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-input accent-primary"
                          {...form.register(`customFields.${index}.secret` as const)}
                        />
                        Secret
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        title="Remove custom field"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : `Save ${definition.singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
