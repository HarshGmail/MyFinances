'use client';

import Link from 'next/link';
import { BarChart3, RefreshCw, Receipt, TrendingUp } from 'lucide-react';

export default function GoldPage() {
  const sections = [
    {
      title: 'Portfolio',
      description: 'View your gold holdings, price trends, and P&L',
      icon: BarChart3,
      href: '/gold/portfolio',
    },
    {
      title: 'Analyzer',
      description: 'Deep analysis with CAGR, volatility, and performance metrics',
      icon: TrendingUp,
      href: '/gold/analyzer',
    },
    {
      title: 'Transactions',
      description: 'Track all your gold buy/sell transactions',
      icon: Receipt,
      href: '/gold/transactions',
    },
    {
      title: 'Update Gold',
      description: 'Add or edit your gold purchases and sales',
      icon: RefreshCw,
      href: '/gold/updateGold',
    },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gold</h1>
        <p className="text-muted-foreground">Manage, analyze, and track your gold investments</p>
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
