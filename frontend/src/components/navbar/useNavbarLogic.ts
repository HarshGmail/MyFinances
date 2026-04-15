import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useLogoutMutation } from '@/api/mutations';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function useNavbarLogic() {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const { mutate: logoutMutate } = useLogoutMutation();
  const router = useRouter();

  // Initialize theme from localStorage or system
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, [setTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
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

  const getNavbarStyle = () => ({
    boxShadow:
      theme === 'dark' ? '0 2px 8px 0 rgba(53, 48, 48, 0.1)' : '0 2px 8px 0 rgba(87, 82, 82, 0.1)',
    background: 'var(--background, #18181b)',
    color: 'var(--foreground, #fff)',
  });

  return {
    user,
    theme,
    toggleTheme,
    handleLogout,
    getNavbarStyle,
    router,
  };
}
