'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
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

export function Navbar() {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const { mutate: logoutMutate } = useLogoutMutation();
  const router = useRouter();

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
    console.log('here');
    router.push('/profile');
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
      <div className="w-full flex items-center justify-between px-6 py-2">
        <div
          className="flex items-center"
          style={{ cursor: 'pointer' }}
          onClick={() => router.push('/home')}
        >
          <Image src="/logo.png" alt="Logo" width={50} height={50} />
          <span className="font-bold text-lg tracking-tight ml-2">MyFinances</span>
        </div>

        {/* Navigation Menu - Only show if user is logged in */}
        {user && (
          <div className="flex">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                {/* Stocks */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger onClick={() => router.push('/stocks/portfolio')}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Stocks
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/stocks/portfolio" className="flex-row items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/stocks/updateStock" className="flex-row items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Update Stocks
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/stocks/transactions" className="flex-row items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Gold */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger onClick={() => router.push('/gold/portfolio')}>
                    <Coins className="w-4 h-4 mr-2" />
                    Gold
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/gold/portfolio" className="flex-row items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/gold/updateGold" className="flex-row items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Update Gold Balance
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/gold/transactions" className="flex-row items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Mutual Funds */}
                <NavigationMenuItem>
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
                            className="flex-row items-center gap-2"
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
                            className="flex-row items-center gap-2"
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
                            className="flex-row items-center gap-2"
                          >
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Crypto */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger onClick={() => router.push('/crypto/portfolio')}>
                    <Bitcoin className="w-4 h-4 mr-2" />
                    Crypto
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/crypto/portfolio" className="flex-row items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Portfolio
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/crypto/updateCrypto" className="flex-row items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Update Crypto Balance
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/crypto/transactions" className="flex-row items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Transactions
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* More */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger onClick={() => router.push('/epf')}>
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    More
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/epf" className="flex-row items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            EPF
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/rd" className="flex-row items-center gap-2">
                            <PiggyBank className="w-4 h-4" />
                            Recurring Deposits
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/fd" className="flex-row items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Fixed Deposits
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link href="/goals" className="flex-row items-center gap-2">
                            <Goal className="w-4 h-4" />
                            Goals
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

        <div className="flex flex-row items-center gap-4">
          {user && (
            <span className="font-medium" onClick={profileClick} style={{ cursor: 'pointer' }}>
              {user.name}
            </span>
          )}
          <button
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className="rounded-full p-2 transition-colors bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 shadow"
          >
            {theme === 'dark' ? (
              <Sun
                style={{
                  cursor: 'pointer',
                }}
                className="w-5 h-5 text-white-400"
              />
            ) : (
              <Moon
                style={{
                  cursor: 'pointer',
                }}
                className="w-5 h-5 text-gray-800"
              />
            )}
          </button>
          {user && (
            <LogOut
              aria-label="logout button"
              onClick={handleLogout}
              style={{
                cursor: 'pointer',
              }}
            />
          )}
        </div>
      </div>
    </nav>
  );
}
