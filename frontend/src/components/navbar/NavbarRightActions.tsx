import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { MobileNav } from './MobileNav';

interface NavbarRightActionsProps {
  user: any;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogout: () => void;
}

export function NavbarRightActions({
  user,
  theme,
  onThemeToggle,
  onLogout,
}: NavbarRightActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* User name - Hidden on mobile */}
      {user && (
        <span
          className="hidden md:block font-medium cursor-pointer hover:text-primary transition-colors"
          onClick={() => router.push('/profile')}
        >
          {user.name}
        </span>
      )}

      {/* Theme toggle */}
      <ThemeToggle theme={theme} onToggle={onThemeToggle} />

      {/* Desktop Logout - Hidden on mobile */}
      {user && (
        <LogOut
          aria-label="logout button"
          onClick={onLogout}
          className="hidden md:block w-5 h-5 cursor-pointer hover:text-primary transition-colors"
        />
      )}

      {/* Mobile Menu - Only shown on mobile when user is logged in */}
      <MobileNav user={user} onLogout={onLogout} />
    </div>
  );
}
