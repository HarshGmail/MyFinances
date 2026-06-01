'use client';

import { useState, useEffect } from 'react';
import { useCustomPdfPasswordsQuery } from '@/api/query';
import { useUpdateCustomPdfPasswordsMutation } from '@/api/mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Plus, Trash2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

const MAX_PASSWORDS = 20;

export default function CustomPasswordsCard() {
  const { data, isLoading } = useCustomPdfPasswordsQuery();
  const { mutateAsync: save, isPending: isSaving } = useUpdateCustomPdfPasswordsMutation();

  const [passwords, setPasswords] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (data?.passwords) setPasswords(data.passwords);
  }, [data?.passwords]);

  const addPassword = () => {
    const pwd = newPassword.trim();
    if (!pwd) return;
    if (passwords.includes(pwd)) {
      toast.error('That password is already in the list');
      return;
    }
    if (passwords.length >= MAX_PASSWORDS) {
      toast.error(`You can store at most ${MAX_PASSWORDS} passwords`);
      return;
    }
    setPasswords((prev) => [...prev, pwd]);
    setNewPassword('');
  };

  const removePassword = (index: number) => {
    setPasswords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await save(passwords);
      toast.success('Custom passwords saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save passwords');
    }
  };

  const dirty = JSON.stringify(passwords) !== JSON.stringify(data?.passwords ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          Custom PDF passwords
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="space-y-1">
            <p>
              These are tried <strong>in addition to</strong> the automatic passwords when opening
              protected PDFs (CDSL eCAS, SafeGold and EPF passbooks).
            </p>
            <p>
              Automatic passwords: <code className="rounded bg-muted px-1">CDSL = your PAN</code>,{' '}
              <code className="rounded bg-muted px-1">
                SafeGold = first 4 of name + last 4 of phone
              </code>
              . If all of these fail, the exact passwords that were tried are shown in the sync
              warnings below so you can see what was being formed.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {passwords.length > 0 ? (
              <ul className="space-y-2">
                {passwords.map((pwd, i) => (
                  <li
                    key={`${pwd}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <code className="min-w-0 flex-1 break-all text-xs sm:text-sm">{pwd}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => removePassword(i)}
                      aria-label="Remove password"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No custom passwords added yet.</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPassword();
                  }
                }}
                placeholder="Add a password to try"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={addPassword}
                disabled={!newPassword.trim()}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!dirty || isSaving} className="gap-1.5">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving…' : 'Save passwords'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
