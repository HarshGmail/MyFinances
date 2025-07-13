import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import React from 'react';
import { PlaceholderCards } from '../ui/placeholder-cards';

interface SummaryStatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  labelClassName?: string;
  valueClassName?: string;
  children?: React.ReactNode;
  loading?: boolean;
}

export function SummaryStatCard({
  label,
  value,
  labelClassName = '',
  valueClassName = '',
  children,
  loading = false,
}: SummaryStatCardProps) {
  if (loading) {
    return <PlaceholderCards count={1} className="h-[120px] min-h-[120px]" />;
  }
  return (
    <Card className="w-full min-w-[180px]">
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium text-muted-foreground ${labelClassName}`}>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
        {children}
      </CardContent>
    </Card>
  );
}
