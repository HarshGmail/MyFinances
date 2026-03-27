import { useState } from 'react';
import { Pencil, Check, X, Eye, EyeOff, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UpdateUserProfile } from '@/api/mutations';
import { toast } from 'sonner';

export function PanField({
  value,
  onUpdate,
  isUpdating,
}: {
  value: string;
  onUpdate: (field: keyof UpdateUserProfile, value: string) => void;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [showPan, setShowPan] = useState(false);

  const handleSave = () => {
    const pan = editValue.toUpperCase().trim();
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      toast.error('Invalid PAN format (e.g. ABCDE1234F)');
      return;
    }
    onUpdate('panNumber', pan);
    setIsEditing(false);
    setEditValue('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const displayValue = value
    ? showPan
      ? value
      : value.slice(0, 5) + '****' + value.slice(-1)
    : '—';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground">PAN Number</div>
          {isEditing ? (
            <Input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.toUpperCase())}
              className="w-48 h-8 mt-1 uppercase"
              placeholder="ABCDE1234F"
              maxLength={10}
            />
          ) : (
            <div className="text-base font-medium font-mono tracking-wider">{displayValue}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isEditing && value && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowPan(!showPan)}
            className="h-8 w-8 p-0 text-muted-foreground"
          >
            {showPan ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={isUpdating}
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isUpdating}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            disabled={isUpdating}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
