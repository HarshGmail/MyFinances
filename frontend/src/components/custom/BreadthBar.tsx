export function BreadthBar({ advancers, decliners }: { advancers: number; decliners: number }) {
  const counted = advancers + decliners;
  if (counted === 0) return null;
  const advancerShare = (advancers / counted) * 100;
  return (
    <div
      className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full"
      role="img"
      aria-label={`${advancers} up, ${decliners} down`}
    >
      {advancers > 0 && (
        <div className="rounded-full bg-green-600" style={{ width: `${advancerShare}%` }} />
      )}
      {decliners > 0 && <div className="flex-1 rounded-full bg-red-600" />}
    </div>
  );
}
