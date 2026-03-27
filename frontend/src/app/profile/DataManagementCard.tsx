import { useState } from 'react';
import { Database, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useDeleteAllStocksMutation,
  useDeleteAllGoldMutation,
  useDeleteAllCryptoMutation,
  useDeleteAllMutualFundsMutation,
  useDeleteAllExpensesMutation,
  useDeleteAllExpenseTransactionsMutation,
  useDeleteAllEpfMutation,
  useDeleteAllFixedDepositsMutation,
  useDeleteAllRecurringDepositsMutation,
} from '@/api/mutations';

export function DataManagementCard() {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { mutateAsync: deleteAllStocks, isPending: isDeletingStocks } =
    useDeleteAllStocksMutation();
  const { mutateAsync: deleteAllGold, isPending: isDeletingGold } = useDeleteAllGoldMutation();
  const { mutateAsync: deleteAllCrypto, isPending: isDeletingCrypto } =
    useDeleteAllCryptoMutation();
  const { mutateAsync: deleteAllMf, isPending: isDeletingMf } = useDeleteAllMutualFundsMutation();
  const { mutateAsync: deleteAllExpenses, isPending: isDeletingExpenses } =
    useDeleteAllExpensesMutation();
  const { mutateAsync: deleteAllExpenseTxns, isPending: isDeletingExpenseTxns } =
    useDeleteAllExpenseTransactionsMutation();
  const { mutateAsync: deleteAllEpf, isPending: isDeletingEpf } = useDeleteAllEpfMutation();
  const { mutateAsync: deleteAllFd, isPending: isDeletingFd } = useDeleteAllFixedDepositsMutation();
  const { mutateAsync: deleteAllRd, isPending: isDeletingRd } =
    useDeleteAllRecurringDepositsMutation();

  const deleteActions = [
    { key: 'stocks', label: 'Stock Transactions', fn: deleteAllStocks, pending: isDeletingStocks },
    { key: 'gold', label: 'Gold Transactions', fn: deleteAllGold, pending: isDeletingGold },
    { key: 'crypto', label: 'Crypto Transactions', fn: deleteAllCrypto, pending: isDeletingCrypto },
    { key: 'mf', label: 'Mutual Fund Transactions', fn: deleteAllMf, pending: isDeletingMf },
    {
      key: 'expenses',
      label: 'Recurring Expenses',
      fn: deleteAllExpenses,
      pending: isDeletingExpenses,
    },
    {
      key: 'expense-txns',
      label: 'Daily Expense Log',
      fn: deleteAllExpenseTxns,
      pending: isDeletingExpenseTxns,
    },
    { key: 'epf', label: 'EPF Accounts', fn: deleteAllEpf, pending: isDeletingEpf },
    { key: 'fd', label: 'Fixed Deposits', fn: deleteAllFd, pending: isDeletingFd },
    { key: 'rd', label: 'Recurring Deposits', fn: deleteAllRd, pending: isDeletingRd },
  ];

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Database className="h-5 w-5" />
          Data Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Permanently delete all data for a specific asset type. This cannot be undone.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {deleteActions.map(({ key, label, fn, pending }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <span className="text-sm font-medium">{label}</span>
            {confirmDelete === key ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Are you sure?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs px-2"
                  disabled={pending}
                  onClick={async () => {
                    try {
                      await fn();
                      toast.success(`${label} deleted`);
                    } catch {
                      toast.error(`Failed to delete ${label}`);
                    } finally {
                      setConfirmDelete(null);
                    }
                  }}
                >
                  {pending ? 'Deleting…' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmDelete(key)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete All
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
