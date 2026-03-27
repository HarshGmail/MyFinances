import { Skeleton } from '@/components/ui/skeleton';
import { getTimeframes } from '@/utils/chartHelpers';

const TIMEFRAMES = getTimeframes();

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card rounded-lg p-4 border border-border">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 relative">
      <div className="text-center mb-4">
        <Skeleton className="h-6 w-48 mx-auto" />
      </div>
      <div className="absolute right-6 top-6 z-10">
        <div className="flex gap-1">
          {TIMEFRAMES.map((_, i) => (
            <Skeleton key={i} className="h-7 w-8 rounded-md" />
          ))}
        </div>
      </div>
      <div className="h-[320px] flex flex-col space-y-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-12" />
              ))}
            </div>
            <div className="ml-16 mr-4 h-full flex flex-col">
              <div className="flex-1 bg-gradient-to-b from-yellow-400/20 to-yellow-400/5 rounded animate-pulse" />
              <div className="flex justify-between mt-2 px-4">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-4 w-12" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvestmentChartSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 mt-6">
      <div className="text-center mb-4">
        <Skeleton className="h-6 w-56 mx-auto" />
      </div>
      <div className="h-[320px] flex flex-col space-y-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between py-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 w-12" />
              ))}
            </div>
            <div className="ml-16 mr-4 h-full flex flex-col">
              <div className="flex-1 flex items-end justify-around px-4 pb-4 space-x-2">
                {[40, 70, 30, 80, 50, 60].map((height, i) => (
                  <div
                    key={i}
                    className="bg-blue-400/30 animate-pulse rounded-t"
                    style={{ height: `${height}%`, width: '8%' }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 px-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-4 w-16" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
