import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '@/lib/theme';

export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
}

const DEFAULT_HEIGHT = 180;
const PLOT_PADDING_Y = 8;
const STROKE_WIDTH = 2;
const DASH_PATTERN = '6,4';
const MARKER_RADIUS = 4;
const GRID_LINES = 3;

function buildPath(
  points: { x: number; y: number }[],
  toX: (x: number) => number,
  toY: (y: number) => number
): string {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${toX(point.x).toFixed(1)},${toY(point.y).toFixed(1)}`
    )
    .join(' ');
}

export function LineChart({
  series,
  height = DEFAULT_HEIGHT,
  formatY,
  formatX,
}: {
  series: ChartSeries[];
  height?: number;
  formatY: (value: number) => string;
  formatX: (value: number) => string;
}) {
  const [width, setWidth] = useState(0);
  const [activeX, setActiveX] = useState<number | null>(null);

  const bounds = useMemo(() => {
    const all = series.flatMap((line) => line.points);
    if (!all.length) return null;
    const xs = all.map((point) => point.x);
    const ys = all.map((point) => point.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY,
      maxY: maxY === minY ? minY + 1 : maxY,
    };
  }, [series]);

  if (!bounds) return <Text className="py-6 text-center text-sm text-muted">No data yet.</Text>;

  const plotHeight = height - PLOT_PADDING_Y * 2;
  const toX = (x: number) =>
    bounds.maxX === bounds.minX
      ? width / 2
      : ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
  const toY = (y: number) =>
    PLOT_PADDING_Y + plotHeight - ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * plotHeight;

  const nearestX = (touchX: number) => {
    const target = bounds.minX + (touchX / Math.max(width, 1)) * (bounds.maxX - bounds.minX);
    const xs = series[0]?.points.map((point) => point.x) ?? [];
    return xs.reduce(
      (best, x) => (Math.abs(x - target) < Math.abs(best - target) ? x : best),
      xs[0]
    );
  };

  const readout = activeX ?? series[0]?.points.at(-1)?.x ?? null;

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {series.map((line) => {
          const point =
            line.points.find((candidate) => candidate.x === readout) ?? line.points.at(-1);
          return (
            <View key={line.label} className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
              <Text className="text-xs text-muted">{line.label}</Text>
              {point ? (
                <Text className="text-xs font-medium text-foreground">{formatY(point.y)}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
      <View
        style={{ height }}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => setActiveX(nearestX(event.nativeEvent.locationX))}
        onResponderMove={(event) => setActiveX(nearestX(event.nativeEvent.locationX))}
        onResponderRelease={() => setActiveX(null)}
        accessible
        accessibilityLabel={series
          .map((line) => `${line.label} ${formatY(line.points.at(-1)?.y ?? 0)}`)
          .join(', ')}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {Array.from({ length: GRID_LINES }, (_, index) => {
              const y = PLOT_PADDING_Y + (plotHeight / (GRID_LINES - 1)) * index;
              return (
                <Line
                  key={index}
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                />
              );
            })}
            {series.map((line) => (
              <Path
                key={line.label}
                d={buildPath(line.points, toX, toY)}
                stroke={line.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={line.dashed ? DASH_PATTERN : undefined}
                fill="none"
              />
            ))}
            {activeX !== null && (
              <>
                <Line
                  x1={toX(activeX)}
                  x2={toX(activeX)}
                  y1={0}
                  y2={height}
                  stroke={colors.muted}
                  strokeWidth={1}
                />
                {series.map((line) => {
                  const point = line.points.find((candidate) => candidate.x === activeX);
                  return point ? (
                    <Circle
                      key={line.label}
                      cx={toX(point.x)}
                      cy={toY(point.y)}
                      r={MARKER_RADIUS}
                      fill={line.color}
                      stroke={colors.card}
                      strokeWidth={2}
                    />
                  ) : null;
                })}
              </>
            )}
          </Svg>
        )}
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[11px] text-muted">{formatX(bounds.minX)}</Text>
        {readout !== null && activeX !== null ? (
          <Text className="text-[11px] font-medium text-foreground">{formatX(readout)}</Text>
        ) : null}
        <Text className="text-[11px] text-muted">{formatX(bounds.maxX)}</Text>
      </View>
    </View>
  );
}
