import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { TrendingUp, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUserProfileQuery } from '@/api/query';
import { useUpdateUserProfileMutation } from '@/api/mutations';
import { AddSalaryRecordDialog } from './AddSalaryRecordDialog';
import { SalaryRecord } from './profileTypes';

export function SalaryHistoryCard() {
  const { data: user, refetch } = useUserProfileQuery();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateUserProfileMutation();
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);

  useEffect(() => {
    if (user?.salaryHistory) setSalaryHistory(user.salaryHistory);
  }, [user]);

  const handleAdd = async (record: SalaryRecord) => {
    const updated = [...salaryHistory, record].sort(
      (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );
    setSalaryHistory(updated);
    try {
      await updateProfile({ data: { salaryHistory: updated } });
      toast.success('Salary record added successfully');
      await refetch();
    } catch {
      toast.error('Failed to add salary record');
    }
  };

  const handleDelete = async (index: number) => {
    const updated = salaryHistory.filter((_, i) => i !== index);
    setSalaryHistory(updated);
    try {
      await updateProfile({ data: { salaryHistory: updated } });
      toast.success('Salary record deleted successfully');
      await refetch();
    } catch {
      toast.error('Failed to delete salary record');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Salary History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track your salary changes over time
            </p>
          </div>
          <AddSalaryRecordDialog onAdd={handleAdd} isUpdating={isUpdating} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {salaryHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No salary records yet. Add one to get started!
          </div>
        ) : (
          salaryHistory.map((record, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold">
                    ₹{record.baseSalary.toLocaleString('en-IN')}
                  </div>
                  {index === 0 && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Effective: {format(new Date(record.effectiveDate), 'PPP')}
                </div>
                {record.notes && (
                  <div className="text-xs text-muted-foreground mt-1">{record.notes}</div>
                )}
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
