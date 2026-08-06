import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChartNoAxesCombined,
  Calculator,
  TrendingUp,
  Coins,
  PieChart,
  Bitcoin,
  MoreHorizontal,
  Building2,
  PiggyBank,
  Wallet,
  Goal,
  Briefcase,
  RefreshCw,
  Receipt,
  Search,
  PictureInPicture2,
  Plug,
  BarChart3,
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

interface DesktopNavProps {
  user: any;
}

type Section = 'stocks' | 'gold' | 'mutual-funds' | 'crypto' | null;

export function DesktopNav({ user }: DesktopNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const currentSection = getActiveSection(pathname);
  const sectionTabs = getSectionTabs(currentSection);

  return (
    <div className="hidden md:flex">
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          {/* Home & Expenses - Always visible */}
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                href="/home"
                className={`flex flex-row items-center px-4 py-2 text-sm font-medium rounded ${
                  pathname === '/home' ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                <ChartNoAxesCombined className="w-4 h-4 mr-2" />
                Home
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link
                href="/expenses"
                className={`flex flex-row items-center px-4 py-2 text-sm font-medium rounded ${
                  pathname === '/expenses' ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Expenses
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          {/* Show section tabs only when in that section */}
          {sectionTabs ? (
            <>
              {sectionTabs.map((tab) => (
                <NavigationMenuItem key={tab.path}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={tab.path}
                      className={`flex flex-row items-center px-4 py-2 text-sm font-medium rounded ${
                        pathname === tab.path ? 'bg-accent' : 'hover:bg-accent'
                      }`}
                    >
                      {tab.icon}
                      <span className="ml-2">{tab.title}</span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </>
          ) : (
            <>
              {/* Stocks - Hidden on tablets */}
              <NavigationMenuItem className="hidden xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/stocks')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Stocks
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <DesktopDropdownMenu items={STOCKS_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Gold - Hidden on tablets */}
              <NavigationMenuItem className="hidden xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/gold')}>
                  <Coins className="w-4 h-4 mr-2" />
                  Gold
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <DesktopDropdownMenu items={GOLD_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Mutual Funds - Hidden on smaller desktops */}
              <NavigationMenuItem className="hidden 2xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/mutual-funds')}>
                  <PieChart className="w-4 h-4 mr-2" />
                  Mutual Funds
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <DesktopDropdownMenu items={MF_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Crypto - Hidden on smaller desktops */}
              <NavigationMenuItem className="hidden 2xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/crypto/portfolio')}>
                  <Bitcoin className="w-4 h-4 mr-2" />
                  Crypto
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <DesktopDropdownMenu items={CRYPTO_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>
            </>
          )}

          {/* More Dropdown - Always visible, filtered based on current section */}
          <NavigationMenuItem>
            <NavigationMenuTrigger>
              <MoreHorizontal className="w-4 h-4 mr-2" />
              More
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[200px] gap-1 p-2">
                {/* Stocks & Gold on tablets - hide if already showing in navbar */}
                {currentSection !== 'stocks' && (
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
                )}
                {currentSection !== 'gold' && (
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
                )}

                {/* MF & Crypto on smaller desktops - hide if already showing in navbar */}
                {currentSection !== 'mutual-funds' && (
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
                )}
                {currentSection !== 'crypto' && (
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
                )}

                {/* Always visible in More */}
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
                <li>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/integrations"
                      className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
                    >
                      <Plug className="w-4 h-4" />
                      Integrations
                    </Link>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

function DesktopDropdownMenu({
  items,
}: {
  items: Array<{ title: string; icon: React.ReactNode; path: string }>;
}) {
  return (
    <ul className="grid w-[200px] gap-1 p-2">
      {items.map((item, index) => (
        <li key={index}>
          <NavigationMenuLink asChild>
            <Link
              href={item.path}
              className="flex-row items-center gap-2 p-2 hover:bg-accent rounded"
            >
              {item.icon}
              {item.title}
            </Link>
          </NavigationMenuLink>
        </li>
      ))}
    </ul>
  );
}

const STOCKS_ITEMS = [
  { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/stocks/portfolio' },
  { title: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, path: '/stocks/analytics' },
  { title: 'Update Stocks', icon: <RefreshCw className="w-4 h-4" />, path: '/stocks/updateStock' },
  { title: 'Transactions', icon: <Receipt className="w-4 h-4" />, path: '/stocks/transactions' },
  { title: 'Search', icon: <Search className="w-4 h-4" />, path: '/stocks/detail' },
];

const GOLD_ITEMS = [
  { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/gold/portfolio' },
  { title: 'Analyzer', icon: <Search className="w-4 h-4" />, path: '/gold/analyzer' },
  {
    title: 'Update Gold Balance',
    icon: <RefreshCw className="w-4 h-4" />,
    path: '/gold/updateGold',
  },
  { title: 'Transactions', icon: <Receipt className="w-4 h-4" />, path: '/gold/transactions' },
];

const MF_ITEMS = [
  { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/mutual-funds/portfolio' },
  { title: 'Dashboard', icon: <PieChart className="w-4 h-4" />, path: '/mutual-funds/dashboard' },
  {
    title: 'Transactions',
    icon: <Receipt className="w-4 h-4" />,
    path: '/mutual-funds/transactions',
  },
];

const CRYPTO_ITEMS = [
  { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/crypto/portfolio' },
  {
    title: 'Update Crypto Balance',
    icon: <RefreshCw className="w-4 h-4" />,
    path: '/crypto/updateCrypto',
  },
  { title: 'Transactions', icon: <Receipt className="w-4 h-4" />, path: '/crypto/transactions' },
];

function getActiveSection(pathname: string): Section {
  if (pathname.startsWith('/stocks')) return 'stocks';
  if (pathname.startsWith('/gold')) return 'gold';
  if (pathname.startsWith('/mutual-funds')) return 'mutual-funds';
  if (pathname.startsWith('/crypto')) return 'crypto';
  return null;
}

function getSectionTabs(
  section: Section
): Array<{ title: string; icon: React.ReactNode; path: string }> | null {
  switch (section) {
    case 'stocks':
      return STOCKS_ITEMS;
    case 'gold':
      return GOLD_ITEMS;
    case 'mutual-funds':
      return MF_ITEMS;
    case 'crypto':
      return CRYPTO_ITEMS;
    default:
      return null;
  }
}
