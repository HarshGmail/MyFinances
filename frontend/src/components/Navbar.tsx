'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  Coins,
  PieChart,
  Bitcoin,
  MoreHorizontal,
  Briefcase,
  RefreshCw,
  Receipt,
  Building2,
  PiggyBank,
  Wallet,
  Goal,
  ChartNoAxesCombined,
  Menu,
  X,
  Calculator,
  PictureInPicture2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useLogoutMutation } from '@/api/mutations';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

export function Navbar() {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const { mutate: logoutMutate } = useLogoutMutation();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // On mount, set theme from localStorage or system
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      // Default to dark
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, [setTheme]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const profileClick = () => {
    router.push('/profile');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logoutMutate(undefined, {
      onSuccess: () => {
        setUser(null);
        localStorage.removeItem('user');
        toast.success('Logout successful!');
        router.push('/');
      },
      onError: (error) => {
        localStorage.removeItem('user');
        toast.error((error as Error)?.message || 'Logout failed.');
        router.push('/');
      },
    });
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  // Mobile menu items structure - No "More" section, show all items
  const mobileMenuItems = [
    {
      title: 'Home',
      icon: <ChartNoAxesCombined className="w-4 h-4" />,
      path: '/home',
    },
    {
      title: 'Expenses',
      icon: <Calculator className="w-4 h-4" />,
      path: '/expenses',
    },
    {
      title: 'Stocks',
      icon: <TrendingUp className="w-4 h-4" />,
      path: '/stocks/portfolio',
      subItems: [
        { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/stocks/portfolio' },
        {
          title: 'Update Stocks',
          icon: <RefreshCw className="w-4 h-4" />,
          path: '/stocks/updateStock',
        },
        {
          title: 'Transactions',
          icon: <Receipt className="w-4 h-4" />,
          path: '/stocks/transactions',
        },
      ],
    },
    {
      title: 'Gold',
      icon: <Coins className="w-4 h-4" />,
      path: '/gold/portfolio',
      subItems: [
        { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/gold/portfolio' },
        { title: 'Update Gold', icon: <RefreshCw className="w-4 h-4" />, path: '/gold/updateGold' },
        {
          title: 'Transactions',
          icon: <Receipt className="w-4 h-4" />,
          path: '/gold/transactions',
        },
      ],
    },
    {
      title: 'Mutual Funds',
      icon: <PieChart className="w-4 h-4" />,
      path: '/mutual-funds/dashboard',
      subItems: [
        {
          title: 'Portfolio',
          icon: <Briefcase className="w-4 h-4" />,
          path: '/mutual-funds/portfolio',
        },
        {
          title: 'Dashboard',
          icon: <PieChart className="w-4 h-4" />,
          path: '/mutual-funds/dashboard',
        },
        {
          title: 'Transactions',
          icon: <Receipt className="w-4 h-4" />,
          path: '/mutual-funds/transactions',
        },
      ],
    },
    {
      title: 'Crypto',
      icon: <Bitcoin className="w-4 h-4" />,
      path: '/crypto/portfolio',
      subItems: [
        { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/crypto/portfolio' },
        {
          title: 'Update Crypto',
          icon: <RefreshCw className="w-4 h-4" />,
          path: '/crypto/updateCrypto',
        },
        {
          title: 'Transactions',
          icon: <Receipt className="w-4 h-4" />,
          path: '/crypto/transactions',
        },
      ],
    },
    {
      title: 'EPF',
      icon: <Building2 className="w-4 h-4" />,
      path: '/epf',
    },
    {
      title: 'Recurring Deposits',
      icon: <PiggyBank className="w-4 h-4" />,
      path: '/rd',
    },
    {
      title: 'Fixed Deposits',
      icon: <Wallet className="w-4 h-4" />,
      path: '/fd',
    },
    {
      title: 'Goals',
      icon: <Goal className="w-4 h-4" />,
      path: '/goals',
    },
  ];

  return (
    <nav
      style={{
        boxShadow:
          theme === 'dark'
            ? '0 2px 8px 0 rgba(53, 48, 48, 0.1)'
            : '0 2px 8px 0 rgba(87, 82, 82, 0.1)',
        background: 'var(--background, #18181b)',
        color: 'var(--foreground, #fff)',
      }}
      className="w-full sticky top-0 z-50"
    >
      <div className="w-full flex items-center justify-between px-4 md:px-6 py-2">
        {/* Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => router.push('/home')}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="md:w-[50px] md:h-[50px]"
          />
          <span className="font-bold text-base md:text-lg tracking-tight ml-2">MyFinances</span>
        </div>

        {/* Desktop Navigation Menu - Hidden on mobile, responsive for tablets */}
        {user && (
          <div className="hidden md:flex">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                {/* Always visible items */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger onClick={() => router.push('/home')}>
                    <ChartNoAxesCombined className="w-4 h-4 mr-2" />
                    Home
                  </NavigationMenuTrigger>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger onClick={() => router.push('/expenses')}>
                    <Calculator className="w-4 h-4 mr-2" />
                    Expenses
                  </NavigationMenuTrigger>
                </NavigationMenuItem>

                {/* Hide these on tablets, show on desktop */}
                <NavigationMenuItem className="hidden xl:flex">
                  <NavigationMenuTrigger onClick={() => router.push('/stocks/portfolio')}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Stocks
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/stocks/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/stocks/updateStock"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Update Stocks
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/stocks/transactions"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden xl:flex">
                  <NavigationMenuTrigger onClick={() => router.push('/gold/portfolio')}>
                    <Coins className="w-4 h-4 mr-2" />
                    Gold
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/gold/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/gold/updateGold"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Update Gold Balance
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/gold/transactions"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden 2xl:flex">
                  <NavigationMenuTrigger onClick={() => router.push('/mutual-funds/dashboard')}>
                    <PieChart className="w-4 h-4 mr-2" />
                    Mutual Funds
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/mutual-funds/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/mutual-funds/dashboard"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <PieChart className="w-4 h-4" />
                            Dashboard
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/mutual-funds/transactions"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem className="hidden 2xl:flex">
                  <NavigationMenuTrigger onClick={() => router.push('/crypto/portfolio')}>
                    <Bitcoin className="w-4 h-4 mr-2" />
                    Crypto
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/crypto/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/crypto/updateCrypto"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Update Crypto Balance
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/crypto/transactions"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* More dropdown - shows different items based on screen size */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger>
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    More
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      {/* Show Stocks & Gold on tablets */}
                      <li className="xl:hidden">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/stocks/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <TrendingUp className="w-4 h-4" />
                            Stocks
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li className="xl:hidden">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/gold/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Coins className="w-4 h-4" />
                            Gold
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {/* Show MF & Crypto on smaller desktops */}
                      <li className="2xl:hidden">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/mutual-funds/dashboard"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <PieChart className="w-4 h-4" />
                            Mutual Funds
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li className="2xl:hidden">
                        <NavigationMenuLink asChild>
                          <Link
                            href="/crypto/portfolio"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Bitcoin className="w-4 h-4" />
                            Crypto
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {/* Always show these in More */}
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/epf"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Building2 className="w-4 h-4" />
                            EPF
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/rd"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <PiggyBank className="w-4 h-4" />
                            Recurring Deposits
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/fd"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Wallet className="w-4 h-4" />
                            Fixed Deposits
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/goals"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <Goal className="w-4 h-4" />
                            Goals
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href="/popup"
                            className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                          >
                            <PictureInPicture2 className="w-4 h-4" />
                            Popup Settings
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        )}

        {/* Right side items */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* User name - Hidden on mobile */}
          {user && (
            <span
              className="hidden md:block font-medium cursor-pointer hover:text-primary transition-colors"
              onClick={profileClick}
            >
              {user.name}
            </span>
          )}

          {/* Theme toggle */}
          <button
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="rounded-full p-1.5 md:p-2 transition-colors bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 shadow"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 md:w-5 md:h-5 text-white-400" />
            ) : (
              <Moon className="w-4 h-4 md:w-5 md:h-5 text-gray-800" />
            )}
          </button>

          {/* Desktop Logout - Hidden on mobile */}
          {user && (
            <LogOut
              aria-label="logout button"
              onClick={handleLogout}
              className="hidden md:block w-5 h-5 cursor-pointer hover:text-primary transition-colors"
            />
          )}

          {/* Mobile Menu Button - Only shown on mobile when user is logged in */}
          {user && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="p-1">
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px] flex flex-col h-full">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>

                {/* User info in mobile menu */}
                <div className="border-b pb-4 mb-4 mt-6">
                  <button
                    onClick={profileClick}
                    className="flex items-center gap-3 w-full p-2 rounded hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">{user.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </button>
                </div>

                {/* Mobile Navigation - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                  <Accordion type="single" collapsible className="w-full">
                    {mobileMenuItems.map((item, index) =>
                      item.subItems ? (
                        <AccordionItem key={index} value={`item-${index}`} className="border-b">
                          <AccordionTrigger className="hover:no-underline py-3 px-3">
                            <div className="flex items-center gap-3">
                              {item.icon}
                              <span>{item.title}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-10 space-y-1 py-2">
                              {item.subItems.map((subItem, subIndex) => (
                                <button
                                  key={subIndex}
                                  onClick={() => handleNavigation(subItem.path)}
                                  className="flex items-center gap-3 w-full p-2 rounded hover:bg-accent transition-colors text-sm"
                                >
                                  {subItem.icon}
                                  <span>{subItem.title}</span>
                                </button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ) : (
                        <button
                          key={index}
                          onClick={() => handleNavigation(item.path)}
                          className="flex items-center gap-3 w-full py-3 px-3 rounded hover:bg-accent transition-colors"
                        >
                          {item.icon}
                          <span>{item.title}</span>
                        </button>
                      )
                    )}
                  </Accordion>
                </div>

                {/* Logout button - Fixed at bottom */}
                <div className="border-t pt-4 pb-4 mt-auto">
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  );
}
