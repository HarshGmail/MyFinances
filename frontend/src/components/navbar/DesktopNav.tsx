import { useEffect, useRef, useState } from 'react';
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
  ChevronRight,
  Lock,
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

type NavItem = { title: string; icon: React.ReactNode; path: string };

/**
 * Removes the 6px gap between a trigger and its dropdown. The gap is dead space
 * that lets Radix close the menu while the pointer travels into the content.
 */
const CONTENT_NO_GAP = 'group-data-[viewport=false]/navigation-menu:mt-0';

/**
 * The "More" panel additionally needs overflow-visible, otherwise the panel
 * clips the submenu flyouts that sit outside its own bounds.
 */
const MORE_CONTENT = `${CONTENT_NO_GAP} group-data-[viewport=false]/navigation-menu:overflow-visible`;

/** Menu row shared by the "More" panel links and its submenu flyouts. */
const MENU_ROW = 'flex flex-row items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent';

export function DesktopNav({ user }: DesktopNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const currentSection = getActiveSection(pathname);
  const sectionTabs = getSectionTabs(currentSection);

  // Inside a section, the other sections' top-level triggers are not rendered at
  // all, so their "More" entries must stay visible at every breakpoint.
  const inSection = sectionTabs !== null;
  const hideAtXl = inSection ? '' : 'xl:hidden';
  const hideAt2xl = inSection ? '' : '2xl:hidden';

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

          {/* Show section dropdown when in that section */}
          {sectionTabs ? (
            <NavigationMenuItem>
              <NavigationMenuTrigger>
                {getSectionIcon(currentSection)}
                {getSectionLabel(currentSection)}
              </NavigationMenuTrigger>
              <NavigationMenuContent className={CONTENT_NO_GAP}>
                <DesktopDropdownMenu items={sectionTabs} />
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <>
              {/* Stocks - Hidden on tablets */}
              <NavigationMenuItem className="hidden xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/stocks')}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Stocks
                </NavigationMenuTrigger>
                <NavigationMenuContent className={CONTENT_NO_GAP}>
                  <DesktopDropdownMenu items={STOCKS_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Gold - Hidden on tablets */}
              <NavigationMenuItem className="hidden xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/gold')}>
                  <Coins className="w-4 h-4 mr-2" />
                  Gold
                </NavigationMenuTrigger>
                <NavigationMenuContent className={CONTENT_NO_GAP}>
                  <DesktopDropdownMenu items={GOLD_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Mutual Funds - Hidden on smaller desktops */}
              <NavigationMenuItem className="hidden 2xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/mutual-funds')}>
                  <PieChart className="w-4 h-4 mr-2" />
                  Mutual Funds
                </NavigationMenuTrigger>
                <NavigationMenuContent className={CONTENT_NO_GAP}>
                  <DesktopDropdownMenu items={MF_ITEMS} />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Crypto - Hidden on smaller desktops */}
              <NavigationMenuItem className="hidden 2xl:flex">
                <NavigationMenuTrigger onClick={() => router.push('/crypto/portfolio')}>
                  <Bitcoin className="w-4 h-4 mr-2" />
                  Crypto
                </NavigationMenuTrigger>
                <NavigationMenuContent className={CONTENT_NO_GAP}>
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
            <NavigationMenuContent className={MORE_CONTENT}>
              <div className="w-[240px] p-1">
                {/* Section submenus - hidden when reachable from the navbar itself */}
                {currentSection !== 'stocks' && (
                  <MoreSubMenu
                    label="Stocks"
                    icon={<TrendingUp className="w-4 h-4" />}
                    items={STOCKS_ITEMS}
                    className={hideAtXl}
                  />
                )}

                {currentSection !== 'gold' && (
                  <MoreSubMenu
                    label="Gold"
                    icon={<Coins className="w-4 h-4" />}
                    items={GOLD_ITEMS}
                    className={hideAtXl}
                  />
                )}

                {currentSection !== 'mutual-funds' && (
                  <MoreSubMenu
                    label="Mutual Funds"
                    icon={<PieChart className="w-4 h-4" />}
                    items={MF_ITEMS}
                    className={hideAt2xl}
                  />
                )}

                {currentSection !== 'crypto' && (
                  <MoreSubMenu
                    label="Crypto"
                    icon={<Bitcoin className="w-4 h-4" />}
                    items={CRYPTO_ITEMS}
                    className={hideAt2xl}
                  />
                )}

                {/* Divider - only meaningful while at least one submenu is visible */}
                <div className={`my-1 border-t border-border ${hideAt2xl}`} />

                {/* Always visible options */}
                {MORE_ITEMS.map((item) => (
                  <NavigationMenuLink key={item.path} asChild>
                    <Link href={item.path} className={MENU_ROW}>
                      {item.icon}
                      {item.title}
                    </Link>
                  </NavigationMenuLink>
                ))}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

function DesktopDropdownMenu({ items }: { items: NavItem[] }) {
  return (
    <ul className="grid w-[200px] gap-1 p-2">
      {items.map((item) => (
        <li key={item.path}>
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

/**
 * Submenu row inside the "More" panel with a flyout opening to its left.
 *
 * Radix's NavigationMenu keeps a single open value per root, so nesting a
 * NavigationMenuTrigger inside NavigationMenuContent makes hovering the nested
 * row close the parent panel. This keeps the row as plain markup and drives the
 * flyout from local hover state instead, with a close delay so the pointer can
 * travel between the row and the flyout.
 */
function MoreSubMenu({
  label,
  icon,
  items,
  className = '',
}: {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => cancelClose, []);

  return (
    <div
      className={`relative ${className}`}
      onPointerEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`${MENU_ROW} w-full justify-between ${open ? 'bg-accent' : ''}`}
      >
        <span className="flex flex-row items-center gap-2">
          {icon}
          {label}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        // The wrapper's padding is the visual gap while staying inside the
        // hover area, so the pointer never crosses dead space.
        <div className="absolute top-0 right-full z-50 pr-1.5">
          <div className="min-w-[200px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {items.map((item) => (
              <NavigationMenuLink key={item.path} asChild>
                <Link href={item.path} className={MENU_ROW} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.title}
                </Link>
              </NavigationMenuLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MORE_ITEMS: NavItem[] = [
  { title: 'EPF', icon: <Building2 className="w-4 h-4" />, path: '/epf' },
  { title: 'Recurring Deposits', icon: <PiggyBank className="w-4 h-4" />, path: '/rd' },
  { title: 'Fixed Deposits', icon: <Wallet className="w-4 h-4" />, path: '/fd' },
  { title: 'Goals', icon: <Goal className="w-4 h-4" />, path: '/goals' },
  { title: 'Vault', icon: <Lock className="w-4 h-4" />, path: '/vault' },
  { title: 'Popup Settings', icon: <PictureInPicture2 className="w-4 h-4" />, path: '/popup' },
  { title: 'Integrations', icon: <Plug className="w-4 h-4" />, path: '/integrations' },
];

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

function getSectionTabs(section: Section): NavItem[] | null {
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

function getSectionIcon(section: Section): React.ReactNode {
  switch (section) {
    case 'stocks':
      return <TrendingUp className="w-4 h-4 mr-2" />;
    case 'gold':
      return <Coins className="w-4 h-4 mr-2" />;
    case 'mutual-funds':
      return <PieChart className="w-4 h-4 mr-2" />;
    case 'crypto':
      return <Bitcoin className="w-4 h-4 mr-2" />;
    default:
      return null;
  }
}

function getSectionLabel(section: Section): string {
  switch (section) {
    case 'stocks':
      return 'Stocks';
    case 'gold':
      return 'Gold';
    case 'mutual-funds':
      return 'Mutual Funds';
    case 'crypto':
      return 'Crypto';
    default:
      return '';
  }
}
