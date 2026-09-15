import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Vault } from 'lucide-react';

export function NavbarLogo() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
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
      <button
        onClick={() => router.push('/vault')}
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        title="Vault"
        aria-label="Open vault"
      >
        <Vault className="h-4 w-4" />
      </button>
    </div>
  );
}
