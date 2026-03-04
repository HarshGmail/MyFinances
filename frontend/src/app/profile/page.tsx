'use client';

import { useUserProfileQuery } from '@/api/query';
import { UpdateUserProfile, useUpdateUserProfileMutation } from '@/api/mutations';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OtpDateInput } from '@/components/ui/otp-date-input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import {
  Pencil,
  Check,
  X,
  User,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Types for salary and payment records
interface SalaryRecord {
  baseSalary: number;
  effectiveDate: string;
  notes?: string;
}

interface MonthlyPayment {
  month: string;
  baseAmount: number;
  bonus: number;
  arrears: number;
  totalPaid: number;
  notes?: string;
}

// Helper function to convert DDMMYYYY to YYYY-MM-DD
const convertToISODate = (dateStr: string) => {
  if (dateStr.length !== 8) return '';
  const day = dateStr.substring(0, 2);
  const month = dateStr.substring(2, 4);
  const year = dateStr.substring(4, 8);
  return `${year}-${month}-${day}`;
};

// Helper function to convert YYYY-MM-DD to DDMMYYYY
const convertFromISODate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}${month}${year}`;
};

// Helper function to get user initials
const getUserInitials = (name: string, email: string) => {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.split('@')[0].slice(0, 2).toUpperCase();
};

interface EditableFieldProps {
  label: string;
  value: string | number;
  field: keyof UpdateUserProfile;
  type?: 'text' | 'email' | 'number' | 'date';
  icon: React.ReactNode;
  onUpdate: (field: keyof UpdateUserProfile, value: string | number) => void;
  isUpdating: boolean;
}

function EditableField({
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

    if (type === 'number') {
      finalValue = parseFloat(editValue) || 0;
    } else if (type === 'date') {
      finalValue = convertToISODate(editValue);
    }

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
    if (type === 'date') {
      return format(new Date(value as string), 'PPP');
    }
    if (type === 'number') {
      return `₹${(value as number).toLocaleString('en-IN')}`;
    }
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

// Salary History Dialog Component
function AddSalaryRecordDialog({
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

    onAdd({
      baseSalary: parseFloat(baseSalary),
      effectiveDate,
      notes: notes || undefined,
    });

    // Reset form
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

// Payment History Dialog Component
function AddPaymentRecordDialog({
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

    // Reset form
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
              value={month ? month.substring(0, 7) : ''} // Show YYYY-MM format
              onChange={(e) => setMonth(e.target.value + '-01')} // Store as YYYY-MM-01
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
                onFocus={(e) => e.target.value === '0' && setBonus('')} // Clear 0 on focus
                onBlur={(e) => e.target.value === '' && setBonus('0')} // Set back to 0 if empty
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
                onFocus={(e) => e.target.value === '0' && setArrears('')} // Clear 0 on focus
                onBlur={(e) => e.target.value === '' && setArrears('0')} // Set back to 0 if empty
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

export default function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useUserProfileQuery();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateUserProfileMutation();

  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<MonthlyPayment[]>([]);

  // Initialize histories from user data
  useState(() => {
    if (user?.salaryHistory) setSalaryHistory(user.salaryHistory);
    if (user?.paymentHistory) setPaymentHistory(user.paymentHistory);
  });

  const handleUpdate = async (field: keyof UpdateUserProfile, value: string | number) => {
    try {
      await updateProfile({ data: { [field]: value } });
      toast.success('Profile updated successfully');
      await refetch();
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Update error:', error);
    }
  };

  const handleAddSalaryRecord = async (record: SalaryRecord) => {
    const updatedHistory = [...salaryHistory, record].sort(
      (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );
    setSalaryHistory(updatedHistory);

    try {
      await updateProfile({ data: { salaryHistory: updatedHistory } });
      toast.success('Salary record added successfully');
      await refetch();
    } catch (error) {
      toast.error('Failed to add salary record');
      console.error('Update error:', error);
    }
  };

  const handleDeleteSalaryRecord = async (index: number) => {
    const updatedHistory = salaryHistory.filter((_, i) => i !== index);
    setSalaryHistory(updatedHistory);

    try {
      await updateProfile({ data: { salaryHistory: updatedHistory } });
      toast.success('Salary record deleted successfully');
      await refetch();
    } catch (error) {
      toast.error('Failed to delete salary record');
      console.error('Update error:', error);
    }
  };

  const handleAddPaymentRecord = async (payment: MonthlyPayment) => {
    const updatedHistory = [...paymentHistory, payment].sort(
      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
    );
    setPaymentHistory(updatedHistory);

    try {
      await updateProfile({ data: { paymentHistory: updatedHistory } });
      toast.success('Payment record added successfully');
      await refetch();
    } catch (error) {
      toast.error('Failed to add payment record');
      console.error('Update error:', error);
    }
  };

  const handleDeletePaymentRecord = async (index: number) => {
    const updatedHistory = paymentHistory.filter((_, i) => i !== index);
    setPaymentHistory(updatedHistory);

    try {
      await updateProfile({ data: { paymentHistory: updatedHistory } });
      toast.success('Payment record deleted successfully');
      await refetch();
    } catch (error) {
      toast.error('Failed to delete payment record');
      console.error('Update error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-6">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-red-500 text-lg font-medium">Error loading profile data</div>
            <p className="text-muted-foreground mt-2">
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userInitials = getUserInitials(user.userName, user.userEmail);
  const isSessionActive = user.session?.expiry ? new Date() < new Date(user.session.expiry) : false;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader className="text-center pb-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{user.userName || 'User'}</CardTitle>
              <p className="text-muted-foreground">{user.userEmail}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant={isSessionActive ? 'default' : 'secondary'} className="gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-green-400' : 'bg-gray-400'}`}
                  />
                  {isSessionActive ? 'Active Session' : 'Session Expired'}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Editable Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Click the pencil icon to edit any field below
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <EditableField
                label="Username"
                value={user.userName}
                field="userName"
                type="text"
                icon={<User className="h-4 w-4" />}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />

              <EditableField
                label="Email Address"
                value={user.userEmail}
                field="userEmail"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />

              <EditableField
                label="Date of Birth"
                value={user.dob ?? ''}
                field="dob"
                type="date"
                icon={<Calendar className="h-4 w-4" />}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />
            </CardContent>
          </Card>

          {/* Session Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Login Time</div>
                    <div className="text-base font-medium">
                      {user.session?.loginTime
                        ? format(new Date(user.session.loginTime), 'PPPp')
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Session Expiry</div>
                    <div className="text-base font-medium">
                      {user.session?.expiry ? format(new Date(user.session.expiry), 'PPPp') : '—'}
                    </div>
                  </div>
                </div>
                <Badge variant={isSessionActive ? 'default' : 'destructive'}>
                  {isSessionActive ? 'Valid' : 'Expired'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 text-green-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Member Since</div>
                    <div className="text-base font-medium">
                      {user.joined ? format(new Date(user.joined), 'PPP') : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Salary History */}
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
                <AddSalaryRecordDialog onAdd={handleAddSalaryRecord} isUpdating={isUpdating} />
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
                      onClick={() => handleDeleteSalaryRecord(index)}
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

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track your actual monthly payments
                  </p>
                </div>
                <AddPaymentRecordDialog onAdd={handleAddPaymentRecord} isUpdating={isUpdating} />
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
                        onClick={() => handleDeletePaymentRecord(index)}
                        disabled={isUpdating}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Base</div>
                        <div className="font-medium">
                          ₹{payment.baseAmount.toLocaleString('en-IN')}
                        </div>
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
        </div>
      </div>
    </div>
  );
}
