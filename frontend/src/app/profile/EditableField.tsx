import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpDateInput } from '@/components/ui/otp-date-input';
import { UpdateUserProfile } from '@/api/mutations';
import { convertToISODate, convertFromISODate } from './profileTypes';

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: keyof UpdateUserProfile;
  type?: 'text' | 'email' | 'number' | 'date';
  icon: React.ReactNode;
  onUpdate: (field: keyof UpdateUserProfile, value: string | number) => void;
  isUpdating: boolean;
}

export function EditableField({
  label,
  value,
  field,
  type = 'text',
  icon,
  onUpdate,
  isUpdating,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    type === 'date' && value ? convertFromISODate(value as string) : value?.toString() || ''
  );

  const handleSave = () => {
    let finalValue: string | number = editValue;
    if (type === 'number') finalValue = parseFloat(editValue) || 0;
    else if (type === 'date') finalValue = convertToISODate(editValue);
    onUpdate(field, finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(
      type === 'date' && value ? convertFromISODate(value as string) : value?.toString() || ''
    );
    setIsEditing(false);
  };

  const displayValue = () => {
    if (!value) return '—';
    if (type === 'date') return format(new Date(value as string), 'PPP');
    if (type === 'number') return `₹${(value as number).toLocaleString('en-IN')}`;
    return value.toString();
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          {isEditing ? (
            <div className="mt-1">
              {type === 'date' ? (
                <OtpDateInput
                  value={editValue}
                  onChange={setEditValue}
                  className="justify-start scale-90 origin-left"
                />
              ) : (
                <Input
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-48 h-8"
                  placeholder={`Enter ${label.toLowerCase()}`}
                  step={type === 'number' ? '0.01' : undefined}
                />
              )}
            </div>
          ) : (
            <div className="text-base font-medium">{displayValue()}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
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
