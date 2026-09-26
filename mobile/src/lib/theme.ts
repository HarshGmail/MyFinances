import palette from './palette';

export const colors = palette;

export function changeColor(value: number): string {
  if (value > 0) return colors.gain;
  if (value < 0) return colors.loss;
  return colors.muted;
}

export function changeClass(value: number): string {
  if (value > 0) return 'text-gain';
  if (value < 0) return 'text-loss';
  return 'text-muted';
}
