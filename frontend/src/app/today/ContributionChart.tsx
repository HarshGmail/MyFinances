'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChangeBarChart from '@/components/custom/ChangeBarChart';
import { ASSET_CLASS_LABELS, AssetMove } from '@/utils/dailyMoves';

export default function ContributionChart({ moves }: { moves: AssetMove[] }) {
  const bars = useMemo(
    () =>
      moves.map((move) => ({
        label: ASSET_CLASS_LABELS[move.assetClass],
        change: move.change,
        changePct: move.changePct,
      })),
    [moves]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>What drove today</CardTitle>
        <p className="text-sm text-muted-foreground">
          Rupee contribution of each asset class to today&apos;s move.
        </p>
      </CardHeader>
      <CardContent>
        <ChangeBarChart bars={bars} />
      </CardContent>
    </Card>
  );
}
