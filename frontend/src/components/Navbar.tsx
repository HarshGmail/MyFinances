'use client';
import { NavbarLogo } from './navbar/NavbarLogo';
import { DesktopNav } from './navbar/DesktopNav';
import { NavbarRightActions } from './navbar/NavbarRightActions';
import { useNavbarLogic } from './navbar/useNavbarLogic';

export function Navbar() {
  const { user, theme, toggleTheme, handleLogout, getNavbarStyle } = useNavbarLogic();

  return (
    <nav style={getNavbarStyle()} className="w-full sticky top-0 z-50">
      <div className="w-full flex items-center justify-between px-4 md:px-6 py-2">
        <NavbarLogo />
        <DesktopNav user={user} />
        <NavbarRightActions
          user={user}
          theme={theme}
          onThemeToggle={toggleTheme}
          onLogout={handleLogout}
        />
      </div>
    </nav>
  );
}
