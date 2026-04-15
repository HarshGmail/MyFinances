import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      aria-label="Toggle dark mode"
      onClick={onToggle}
      className="rounded-full p-1.5 md:p-2 transition-colors bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 shadow"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 md:w-5 md:h-5 text-white-400" />
      ) : (
        <Moon className="w-4 h-4 md:w-5 md:h-5 text-gray-800" />
      )}
    </button>
  );
}
