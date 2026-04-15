import Image from 'next/image';
import { useRouter } from 'next/navigation';

export function NavbarLogo() {
  const router = useRouter();

  return (
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
  );
}
