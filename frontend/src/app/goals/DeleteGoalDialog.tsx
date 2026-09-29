'use client';

import { toast } from 'sonner';
import { useDeleteGoalMutation } from '@myfinances/core/api/mutations/userGoals';
import type { UserGoal } from '@myfinances/core/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mutationErrorMessage } from './goalDisplay';

export function DeleteGoalDialog({
  goal,
  onOpenChange,
  onDeleted,
}: {
  goal: UserGoal | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteGoal = useDeleteGoalMutation();

  const confirmDelete = () => {
    if (!goal) return;
    deleteGoal.mutate(goal._id, {
      onSuccess: () => {
        toast.success(`Deleted "${goal.goalName}"`);
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (error) =>
        toast.error('Could not delete goal', { description: mutationErrorMessage(error) }),
    });
  };

  return (
    <Dialog open={goal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete goal?</DialogTitle>
          <DialogDescription>
            &quot;{goal?.goalName}&quot; will be removed and its holdings freed up for other goals.
            Your investments themselves are not touched. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteGoal.isPending}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleteGoal.isPending}>
            {deleteGoal.isPending ? 'Deleting…' : 'Delete goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
