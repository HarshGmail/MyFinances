'use client';
// import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components';

export default function Home() {
  //   const user = useAppStore((state) => state.user);
  return (
    <div>
      <Button variant={'secondary'} className="bg-[#41246e]" style={{ cursor: 'pointer' }}>
        Upstocx
      </Button>
    </div>
  );
}
