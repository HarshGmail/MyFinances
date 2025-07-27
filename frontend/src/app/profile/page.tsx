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
import { format } from 'date-fns';
import { Pencil, Check, X, User, Mail, Calendar, DollarSign, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
    if (type === 'number' && field === 'monthlySalary') {
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

export default function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useUserProfileQuery();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateUserProfileMutation();

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

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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
      <div className="p-6 max-w-4xl mx-auto">
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
            label="Monthly Salary"
            value={user.monthlySalary}
            field="monthlySalary"
            type="number"
            icon={<DollarSign className="h-4 w-4" />}
            onUpdate={handleUpdate}
            isUpdating={isUpdating}
          />

          <EditableField
            label="Date of Birth"
            value={user.dob}
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
                  {user.session?.loginTime ? format(new Date(user.session.loginTime), 'PPPp') : '—'}
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
  );
}
