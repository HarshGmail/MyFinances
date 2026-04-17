import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function EpfPageSkeleton() {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <Skeleton className="h-9 w-16 mx-auto" />
        <Skeleton className="h-10 w-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[500px]" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="w-full">
              <div className="border-b pb-2 mb-4">
                <div className="grid grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="grid grid-cols-5 gap-4 py-2">
                    {[1, 2, 3, 4, 5].map((col) => (
                      <Skeleton key={col} className="h-4 w-20" />
                    ))}
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="grid grid-cols-5 gap-4 py-2">
                  <div className="col-span-4">
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
