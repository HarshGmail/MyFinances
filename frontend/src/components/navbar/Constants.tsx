import {
  ChartNoAxesCombined,
  Calculator,
  TrendingUp,
  Coins,
  PieChart,
  Bitcoin,
  Building2,
  PiggyBank,
  Wallet,
  Goal,
  Plug,
  Briefcase,
  RefreshCw,
  Receipt,
  Search,
} from 'lucide-react';

export const MOBILE_MENU_ITEMS = [
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
      { title: 'Search', icon: <Search className="w-4 h-4" />, path: '/stocks/detail' },
    ],
  },
  {
    title: 'Gold',
    icon: <Coins className="w-4 h-4" />,
    path: '/gold',
    subItems: [
      { title: 'Portfolio', icon: <Briefcase className="w-4 h-4" />, path: '/gold/portfolio' },
      { title: 'Analyzer', icon: <Search className="w-4 h-4" />, path: '/gold/analyzer' },
      { title: 'Update Gold', icon: <RefreshCw className="w-4 h-4" />, path: '/gold/updateGold' },
      { title: 'Transactions', icon: <Receipt className="w-4 h-4" />, path: '/gold/transactions' },
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
      { title: 'Analyzer', icon: <Search className="w-4 h-4" />, path: '/mutual-funds/analyzer' },
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
  {
    title: 'Integrations',
    icon: <Plug className="w-4 h-4" />,
    path: '/integrations',
  },
];
