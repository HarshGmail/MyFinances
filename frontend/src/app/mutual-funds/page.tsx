'use client';

import Link from 'next/link';
import { TrendingUp, BarChart3, Send, Search } from 'lucide-react';

export default function MutualFundsPage() {
  const sections = [
    {
      title: 'Dashboard',
      description: 'View NAV trends and XIRR for your mutual funds',
      icon: TrendingUp,
      href: '/mutual-funds/dashboard',
    },
    {
      title: 'Portfolio',
      description: 'Manage your mutual fund investments',
      icon: BarChart3,
      href: '/mutual-funds/portfolio',
    },
    {
      title: 'Transactions',
      description: 'View and track all buy/sell transactions',
      icon: Send,
      href: '/mutual-funds/transactions',
    },
    {
      title: 'Analyze a Fund',
      description: 'Deep-dive analysis with fundamentals and performance metrics',
      icon: Search,
      href: '/mutual-funds/analyzer',
    },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mutual Funds</h1>
        <p className="text-muted-foreground">
          Manage, track, and analyze your mutual fund investments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="p-6 border rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{section.title}</h2>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
