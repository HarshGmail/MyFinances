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
import { MonthlyPayment } from './profileTypes';

export function AddPaymentRecordDialog({
  onAdd,
  isUpdating,
}: {
  onAdd: (payment: MonthlyPayment) => void;
  isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [bonus, setBonus] = useState('0');
  const [arrears, setArrears] = useState('0');
  const [notes, setNotes] = useState('');

  const totalPaid =
    (parseFloat(baseAmount) || 0) + (parseFloat(bonus) || 0) + (parseFloat(arrears) || 0);

  const handleSubmit = () => {
    if (!month || !baseAmount) {
      toast.error('Please fill in all required fields');
      return;
    }
    onAdd({
      month,
      baseAmount: parseFloat(baseAmount),
      bonus: parseFloat(bonus) || 0,
      arrears: parseFloat(arrears) || 0,
      totalPaid,
      notes: notes || undefined,
    });
    setMonth('');
    setBaseAmount('');
    setBonus('0');
    setArrears('0');
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Record</DialogTitle>
          <DialogDescription>Record a monthly salary payment</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month *</Label>
            <Input
              id="month"
              type="month"
              value={month ? month.substring(0, 7) : ''}
              onChange={(e) => setMonth(e.target.value + '-01')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseAmount">Base Amount *</Label>
            <Input
              id="baseAmount"
              type="number"
              placeholder="98988"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              step="0.01"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bonus">Bonus</Label>
              <Input
                id="bonus"
                type="number"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                onFocus={(e) => e.target.value === '0' && setBonus('')}
                onBlur={(e) => e.target.value === '' && setBonus('0')}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrears">Arrears</Label>
              <Input
                id="arrears"
                type="number"
                placeholder="0"
                value={arrears}
                onChange={(e) => setArrears(e.target.value)}
                onFocus={(e) => e.target.value === '0' && setArrears('')}
                onBlur={(e) => e.target.value === '' && setArrears('0')}
                step="0.01"
              />
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-xl font-bold">₹{totalPaid.toLocaleString('en-IN')}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notes</Label>
            <Textarea
              id="paymentNotes"
              placeholder="e.g., Includes Oct arrears, Performance bonus"
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
            Add Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
