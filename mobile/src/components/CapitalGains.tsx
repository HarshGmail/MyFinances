import { Text, View } from 'react-native';
import { useCapitalGainsQuery } from '@myfinances/core/api/query/capitalGains';
import { formatCurrency } from '@myfinances/core/calc/numbers';
import { Card, Label, Row } from './ui';
import { changeClass } from '@/lib/theme';

function GainRow({ label, value }: { label: string; value: number }) {
  return (
    <Row
      label={label}
      value={
        <Text className={`text-sm font-medium ${changeClass(value)}`}>{formatCurrency(value)}</Text>
      }
    />
  );
}

export function CapitalGainsOverview() {
  const { data, isLoading } = useCapitalGainsQuery();

  if (isLoading || !data) return null;

  const fy = data.summary.currentFY;
  const s = fy ? data.summary.byFY[fy] : undefined;

  if (!s) return null;

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">Capital gains · FY {fy}</Text>
        <Label>Realized</Label>
      </View>
      <GainRow label="Equity STCG" value={s.equityStcg} />
      <GainRow label="Equity LTCG" value={s.equityLtcg} />
      <GainRow label="Crypto" value={s.cryptoGains} />
      <GainRow label="Gold" value={s.goldStcg + s.goldLtcg} />
      <Row label="Estimated tax" value={formatCurrency(s.totalEstimatedTax)} />
      <Label>
        Equity LTCG up to ₹1.25L a year is exempt; not applied here. Digital gold is shown untaxed.
      </Label>
    </Card>
  );
}

export function AssetCapitalGains({
  asset,
}: {
  asset: 'stocks' | 'mutualFunds' | 'gold' | 'crypto';
}) {
  const { data, isLoading } = useCapitalGainsQuery();

  if (isLoading || !data) return null;

  const byFY = data.byAsset[asset].realizedByFY ?? {};
  const fy = data.summary.currentFY ?? '';
  const current = byFY[fy];

  if (!current) return null;

  return (
    <Card>
      <Text className="text-base font-semibold text-foreground">Realized gains · FY {fy}</Text>
      {asset === 'crypto' ? (
        <>
          <GainRow label="Gains" value={current.flatGains ?? 0} />
          <Row label="Tax (30%)" value={formatCurrency(current.flatTax ?? 0)} />
        </>
      ) : (
        <>
          <GainRow label="Short term" value={current.stcgGains} />
          <GainRow label="Long term" value={current.ltcgGains} />
          <Row label="Estimated tax" value={formatCurrency(current.stcgTax + current.ltcgTax)} />
        </>
      )}
      {asset === 'gold' && <Label>Digital gold gains are shown untaxed.</Label>}
    </Card>
  );
}
