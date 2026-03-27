'use client';

import { useState } from 'react';
import { useUserProfileQuery } from '@/api/query';
import { useRegenerateIngestTokenMutation } from '@/api/mutations';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, Bot, Mail, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import UpiIntegration from './UpiIntegration';
import McpIntegration from './McpIntegration';
import EmailIntegration from './EmailIntegration';

const INTEGRATIONS = [
  {
    id: 'upi',
    name: 'UPI Auto-Track',
    icon: Smartphone,
    description: 'Auto-log UPI payments via iPhone Shortcuts',
    badge: 'iOS',
  },
  {
    id: 'mcp',
    name: 'Claude MCP',
    icon: Bot,
    description: 'Connect your finances to Claude AI',
    badge: 'AI',
  },
  {
    id: 'email',
    name: 'Email Import',
    icon: Mail,
    description: 'Auto-import from CDSL eCAS, SafeGold & CoinDCX',
    badge: 'New',
  },
] as const;

type TabId = (typeof INTEGRATIONS)[number]['id'];

export default function IntegrationsPage() {
  const [selected, setSelected] = useState<TabId>('upi');
  const { data: profile, isLoading, refetch } = useUserProfileQuery();
  const { mutateAsync: regenerateToken, isPending: isRegenerating } =
    useRegenerateIngestTokenMutation();

  const handleRegenerate = async () => {
    try {
      await regenerateToken();
      toast.success('Token regenerated successfully');
      await refetch();
    } catch {
      toast.error('Failed to regenerate token');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-6">
          <div className="w-56 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect external services to automate and enhance your finance tracking.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-56 shrink-0">
          <nav className="space-y-1">
            {INTEGRATIONS.map(({ id, name, icon: Icon, description, badge }) => (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors group ${
                  selected === id
                    ? 'bg-primary/10 border-primary/30 text-foreground'
                    : 'border-transparent hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {badge}
                    </Badge>
                    <ChevronRight
                      className={`h-3 w-3 transition-opacity ${selected === id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-tight">{description}</p>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0">
          {selected === 'upi' && (
            <UpiIntegration
              ingestToken={profile?.ingestToken}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
            />
          )}
          {selected === 'mcp' && <McpIntegration ingestToken={profile?.ingestToken} />}
          {selected === 'email' && (
            <EmailIntegration
              onConnected={() => {
                setSelected('email');
                toast.success('Gmail connected successfully');
              }}
              onConnectionError={(msg) => {
                setSelected('email');
                toast.error(`Gmail connection failed: ${msg}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
