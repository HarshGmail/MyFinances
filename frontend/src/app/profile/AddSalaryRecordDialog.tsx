import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SalaryRecord } from './profileTypes';

export function AddSalaryRecordDialog({
  onAdd,
  isUpdating,
}: {
  onAdd: (record: SalaryRecord) => void;
  isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [baseSalary, setBaseSalary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!baseSalary || !effectiveDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    onAdd({ baseSalary: parseFloat(baseSalary), effectiveDate, notes: notes || undefined });
    setBaseSalary('');
    setEffectiveDate('');
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Salary Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Salary Record</DialogTitle>
          <DialogDescription>Record a salary change or hike</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="baseSalary">Base Salary *</Label>
            <Input
              id="baseSalary"
              type="number"
              placeholder="98988"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date *</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., 36% hike, Promotion"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            Add Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
