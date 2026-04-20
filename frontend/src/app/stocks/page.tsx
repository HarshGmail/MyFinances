'use client';

import Link from 'next/link';
import { BarChart3, RefreshCw, Receipt, Search, PieChart } from 'lucide-react';

export default function StocksPage() {
  const sections = [
    {
      title: 'Portfolio',
      description: 'View your stock holdings, performance, and P&L',
      icon: BarChart3,
      href: '/stocks/portfolio',
    },
    {
      title: 'Research & Analyze',
      description: 'Search stocks and view detailed financial analysis',
      icon: Search,
      href: '/stocks/detail',
    },
    {
      title: 'Transactions',
      description: 'Track all your buy/sell transactions',
      icon: Receipt,
      href: '/stocks/transactions',
    },
    {
      title: 'Update Holdings',
      description: 'Add or edit your stock transactions',
      icon: RefreshCw,
      href: '/stocks/updateStock',
    },
    {
      title: 'Portfolio Analytics',
      description:
        'Deep fundamental analysis across all your holdings — valuation, profitability, growth, and risk',
      icon: PieChart,
      href: '/stocks/analytics',
    },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stocks</h1>
        <p className="text-muted-foreground">Manage, analyze, and track your stock investments</p>
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
