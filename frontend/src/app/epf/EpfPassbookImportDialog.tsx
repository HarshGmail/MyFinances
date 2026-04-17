'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParseEpfPassbooksMutation, useBulkUpdateEpfAccountsMutation } from '@/api/mutations';
import { EpfParsedSegment } from '@/api/dataInterface';
import { formatCurrency } from '@/utils/numbers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = 'upload' | 'confirm' | 'done';

function formatStartDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix ("data:application/pdf;base64,")
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EpfPassbookImportDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [segments, setSegments] = useState<EpfParsedSegment[]>([]);
  const [establishmentName, setEstablishmentName] = useState('');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);

  const { mutateAsync: parsePassbooks, isPending: isParsing } = useParseEpfPassbooksMutation();
  const { mutateAsync: bulkUpdate, isPending: isImporting } = useBulkUpdateEpfAccountsMutation();

  function resetDialog() {
    setPhase('upload');
    setSelectedFiles([]);
    setSegments([]);
    setEstablishmentName('');
    setChecked({});
  }

  function handleClose(open: boolean) {
    if (!open) resetDialog();
    onOpenChange(open);
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const pdfs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
    );
    if (!pdfs.length) {
      toast.error('Please select PDF files');
      return;
    }
    setSelectedFiles(pdfs);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  }

  async function handleParse() {
    if (!selectedFiles.length) return;
    try {
      const filesPayload = await Promise.all(
        selectedFiles.map(async (f) => ({ data: await readFileAsBase64(f), name: f.name }))
      );
      const result = await parsePassbooks(filesPayload);
      setSegments(result.segments);
      setEstablishmentName(result.establishmentName);
      // default: check only new ones
      const initial: Record<number, boolean> = {};
      result.segments.forEach((s, i) => {
        initial[i] = !s.alreadyExists;
      });
      setChecked(initial);
      setPhase('confirm');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse passbook');
    }
  }

  async function handleImport() {
    const toImport = segments.filter((_, i) => checked[i]);
    if (!toImport.length) {
      toast.error('Select at least one record to import');
      return;
    }
    try {
      await bulkUpdate({
        accounts: toImport.map((s) => ({
          organizationName: s.organizationName,
          epfAmount: s.epfAmount,
          creditDay: s.creditDay,
          startDate: s.startDate,
        })),
      });
      toast.success(`${toImport.length} record${toImport.length > 1 ? 's' : ''} imported`);
      setPhase('done');
      setTimeout(() => handleClose(false), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import records');
    }
  }

  const allNew = segments.filter((_, i) => checked[i]).length;
  const allChecked = segments.every((_, i) => checked[i]);
  const noneChecked = segments.every((_, i) => !checked[i]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from EPF Passbook</DialogTitle>
        </DialogHeader>

        {phase === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-600 hover:border-zinc-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm text-zinc-400">
                Drop your EPFO passbook PDFs here, or click to select
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                You can upload multiple financial year PDFs at once
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-1">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-green-400">✓</span> {f.name}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={!selectedFiles.length || isParsing}>
                {isParsing ? 'Parsing...' : 'Parse Passbook'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Review contributions from{' '}
              <span className="text-white font-medium">{establishmentName}</span>. Unchecked rows
              already exist in your records.
            </p>

            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
              <span>
                {allNew} new record{allNew !== 1 ? 's' : ''} selected
              </span>
              <button
                className="text-blue-400 hover:text-blue-300"
                onClick={() => {
                  const all = !allChecked;
                  const next: Record<number, boolean> = {};
                  segments.forEach((_, i) => {
                    next[i] = all;
                  });
                  setChecked(next);
                }}
              >
                {allChecked ? 'Deselect all' : noneChecked ? 'Select all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {segments.map((seg, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked[i]
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : 'border-zinc-700 bg-zinc-800/50 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{seg.organizationName}</span>
                      {seg.alreadyExists && (
                        <span className="text-xs text-zinc-500 shrink-0">already saved</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      from {formatStartDate(seg.startDate)} · {formatCurrency(seg.epfAmount)}/month
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setPhase('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={allNew === 0 || isImporting}>
                {isImporting ? 'Importing...' : `Import ${allNew} Record${allNew !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
