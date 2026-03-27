import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardSkeleton() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-center w-full md:w-auto">Portfolio Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Skeleton className="w-full h-[120px]" />
        <Skeleton className="w-full h-[120px]" />
        <Skeleton className="w-full h-[120px]" />
        <Skeleton className="w-full h-[120px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="flex items-stretch">
          <Skeleton className="w-full h-[420px]" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="w-full h-[200px]" />
          <Skeleton className="w-full h-[200px]" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="w-full h-[200px]" />
          <Skeleton className="w-full h-[200px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Skeleton className="w-full h-[200px]" />
        <Skeleton className="w-full h-[200px]" />
        <Skeleton className="w-full h-[200px]" />
      </div>
    </div>
  );
}
