'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { SignupForm, LoginForm, SectionTabs, BackendWarmup } from '@/components';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  BarChart3,
  Zap,
  Mail,
  Bot,
  Coins,
  Landmark,
  PiggyBank,
  Target,
  ChevronRight,
  Star,
} from 'lucide-react';

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Stocks & Mutual Funds',
    desc: 'Track your equity and MF portfolio with live NAV, XIRR, and P&L across all holdings.',
  },
  {
    icon: Coins,
    title: 'Gold & Crypto',
    desc: 'Monitor digital gold and crypto positions with real-time prices from SafeGold and CoinDCX.',
  },
  {
    icon: Landmark,
    title: 'EPF, FD & RD',
    desc: 'Keep tabs on provident fund, fixed deposits, and recurring deposits in one place.',
  },
  {
    icon: PiggyBank,
    title: 'Expense Tracking',
    desc: 'Log daily spending and set recurring expenses. See your savings rate month by month.',
  },
  {
    icon: Target,
    title: 'Investment Goals',
    desc: 'Define financial goals and track progress toward them as your portfolio grows.',
  },
  {
    icon: BarChart3,
    title: 'Unified Dashboard',
    desc: 'One master dashboard showing your entire net worth, allocation, and XIRR across all assets.',
  },
  {
    icon: Mail,
    title: 'Email Auto-Import',
    desc: 'Connect Gmail to auto-import CDSL eCAS and SafeGold statements — no manual data entry.',
  },
  {
    icon: Bot,
    title: 'Claude AI Integration',
    desc: 'Ask questions and log transactions in natural language via the Claude MCP integration.',
  },
  {
    icon: Zap,
    title: 'UPI Auto-Track',
    desc: 'iPhone Shortcut automatically logs UPI payment SMS as expense transactions instantly.',
  },
];

const SCREENSHOTS = [
  { label: 'Portfolio Dashboard', src: '/screenshots/portfolio-dashboard.png' },
  { label: 'Stocks Portfolio', src: '/screenshots/stocks-portfolio.png' },
  { label: 'Expense Tracker', src: '/screenshots/expense-tracker.png' },
];

export default function Auth() {
  const [showAuth, setShowAuth] = useState(false);
  const authRef = useRef<HTMLDivElement>(null);

  const openAuth = () => {
    setShowAuth(true);
    // If already shown, just scroll; otherwise wait a tick for render
    setTimeout(() => {
      authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  return (
    <div className="min-h-[calc(100vh-66px)]">
      <BackendWarmup />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/10 blur-3xl -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
          <Star className="h-3 w-3 fill-current" />
          Personal Finance, Finally Under Control
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight mb-6">
          Your entire wealth,
          <br />
          <span className="text-primary">one dashboard.</span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-8">
          Track stocks, mutual funds, gold, crypto, EPF, FD, and expenses. Auto-import from CDSL and
          SafeGold emails. Built for Indian investors.
        </p>

        <div className="flex items-center gap-3">
          <Button size="lg" className="gap-2 px-8" onClick={openAuth}>
            Get Started Free
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={openAuth}>
            Sign In
          </Button>
        </div>

        {showAuth && (
          <div ref={authRef} className="mt-10 w-full max-w-md">
            <div className="rounded-lg bg-[#c7c8cb] dark:bg-[#111214] p-8">
              <SectionTabs
                tabs={[
                  { tabName: 'Login', tabComponent: <LoginForm /> },
                  { tabName: 'SignUp', tabComponent: <SignupForm /> },
                ]}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Screenshots ──────────────────────────────────── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SCREENSHOTS.map(({ label, src }) => (
            <div key={label} className="space-y-2">
              <div className="rounded-xl border overflow-hidden bg-muted/30 aspect-video relative">
                <Image src={src} alt={label} fill className="object-cover object-top" />
              </div>
              <p className="text-xs text-center text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Everything you need</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Built specifically for the Indian investor — from equity to digital gold to UPI
            expenses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="p-5 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Claude MCP ───────────────────────────────────── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="rounded-2xl border bg-gradient-to-br from-violet-500/5 via-transparent to-transparent p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/5 text-violet-500 text-xs font-medium mb-4">
              <Bot className="h-3 w-3" />
              Claude AI · MCP Integration
            </div>
            <h2 className="text-3xl font-bold mb-3">Talk to your finances</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Connect your data to Claude AI via the Model Context Protocol. Ask questions, log
              transactions, and analyse your portfolio — all in plain English, right inside
              Claude.ai.
            </p>
            <Button variant="outline" size="sm" className="gap-2" onClick={openAuth}>
              Get started
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex-1 w-full space-y-2">
            {[
              'How much did I spend on food this month?',
              "What's my mutual fund XIRR?",
              'Add 10 shares of HDFC Bank at ₹1800',
              'Show me my stock portfolio P&L',
              'Log ₹450 expense for dinner at Zomato',
              'How much gold do I hold and what is it worth?',
            ].map((example, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/50"
              >
                <Bot className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <span className="text-sm text-muted-foreground">{example}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-xl mx-auto p-10 rounded-2xl border bg-gradient-to-b from-primary/5 to-transparent">
          <h2 className="text-3xl font-bold mb-3">Start tracking today</h2>
          <p className="text-muted-foreground mb-6">
            Free forever. No subscriptions, no ads, no data selling.
          </p>
          <Button size="lg" className="gap-2 px-8" onClick={openAuth}>
            Create your account
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        Built for personal use · Data stays in your own account · No tracking ·{' '}
        <a href="/privacy" className="underline hover:text-foreground transition-colors">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
