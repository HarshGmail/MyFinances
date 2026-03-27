'use client';

import { format } from 'date-fns';
import { User, Mail, Calendar, Clock, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useUserProfileQuery } from '@/api/query';
import { useUpdateUserProfileMutation, UpdateUserProfile } from '@/api/mutations';
import { EditableField } from './EditableField';
import { PanField } from './PanField';
import { SalaryHistoryCard } from './SalaryHistoryCard';
import { PaymentHistoryCard } from './PaymentHistoryCard';
import { DataManagementCard } from './DataManagementCard';
import { getUserInitials } from './profileTypes';

export default function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useUserProfileQuery();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateUserProfileMutation();

  const handleUpdate = async (field: keyof UpdateUserProfile, value: string | number) => {
    try {
      await updateProfile({ data: { [field]: value } });
      toast.success('Profile updated successfully');
      await refetch();
    } catch {
      toast.error('Failed to update profile');
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
              <EditableField
                label="Phone Number"
                value={user.phone ?? ''}
                field="phone"
                type="text"
                icon={<Phone className="h-4 w-4" />}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />
              <PanField
                value={user.panNumber ?? ''}
                onUpdate={handleUpdate}
                isUpdating={isUpdating}
              />
            </CardContent>
          </Card>

          {/* Session Details */}
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

          {/* Integrations link */}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Looking for UPI Auto-Track or Claude MCP setup?{' '}
                <a href="/integrations" className="text-primary underline font-medium">
                  Visit the Integrations page →
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SalaryHistoryCard />
          <PaymentHistoryCard />
          <DataManagementCard />
        </div>
      </div>
    </div>
  );
}
