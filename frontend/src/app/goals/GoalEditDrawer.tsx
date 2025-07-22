import GoalForm, { FormValues } from './GoalForm';
import { useUpdateGoalMutation } from '@/api/mutations';
import { UserGoal } from '@/api/dataInterface';

interface AssetOption {
  type: 'stock' | 'mutualFund' | 'crypto' | 'allStocks' | 'allMutualFunds' | 'allCrypto';
  value: string;
  label: string;
}

interface GoalEditDrawerProps {
  goal: Partial<UserGoal>;
  onClose: () => void;
  assetOptions: {
    stocks: AssetOption[];
    mutualFunds: AssetOption[];
    crypto: AssetOption[];
  };
}

export default function GoalEditDrawer({ goal, onClose, assetOptions }: GoalEditDrawerProps) {
  const { mutate, isPending } = useUpdateGoalMutation();

  function handleUpdate(values: FormValues) {
    if (!goal._id) return;
    mutate({ id: goal._id, data: values }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-1/2 bg-background shadow-xl transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="text-lg font-semibold">Edit Goal</div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <GoalForm
              initialValues={goal}
              onSubmit={handleUpdate}
              submitLabel={isPending ? 'Updating...' : 'Update'}
              isPending={isPending}
              onCancel={onClose}
              assetOptions={assetOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
