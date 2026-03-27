import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Wallet, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useUserProfileQuery } from '@/api/query';
import { useUpdateUserProfileMutation } from '@/api/mutations';
import { AddPaymentRecordDialog } from './AddPaymentRecordDialog';
import { MonthlyPayment } from './profileTypes';

export function PaymentHistoryCard() {
  const { data: user, refetch } = useUserProfileQuery();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateUserProfileMutation();
  const [paymentHistory, setPaymentHistory] = useState<MonthlyPayment[]>([]);

  useEffect(() => {
    if (user?.paymentHistory) setPaymentHistory(user.paymentHistory);
  }, [user]);

  const handleAdd = async (payment: MonthlyPayment) => {
    const updated = [...paymentHistory, payment].sort(
      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
    );
    setPaymentHistory(updated);
    try {
      await updateProfile({ data: { paymentHistory: updated } });
      toast.success('Payment record added successfully');
      await refetch();
    } catch {
      toast.error('Failed to add payment record');
    }
  };

  const handleDelete = async (index: number) => {
    const updated = paymentHistory.filter((_, i) => i !== index);
    setPaymentHistory(updated);
    try {
      await updateProfile({ data: { paymentHistory: updated } });
      toast.success('Payment record deleted successfully');
      await refetch();
    } catch {
      toast.error('Failed to delete payment record');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Track your actual monthly payments</p>
          </div>
          <AddPaymentRecordDialog onAdd={handleAdd} isUpdating={isUpdating} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {paymentHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payment records yet. Add one to get started!
          </div>
        ) : (
          paymentHistory.map((payment, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">
                    {format(new Date(payment.month), 'MMMM yyyy')}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ₹{payment.totalPaid.toLocaleString('en-IN')}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(index)}
                  disabled={isUpdating}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Base</div>
                  <div className="font-medium">₹{payment.baseAmount.toLocaleString('en-IN')}</div>
                </div>
                {payment.bonus > 0 && (
                  <div>
                    <div className="text-muted-foreground">Bonus</div>
                    <div className="font-medium text-green-600">
                      +₹{payment.bonus.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
                {payment.arrears > 0 && (
                  <div>
                    <div className="text-muted-foreground">Arrears</div>
                    <div className="font-medium text-blue-600">
                      +₹{payment.arrears.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
              {payment.notes && (
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  {payment.notes}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
