const SERIES_COUNT = 5;

/** Color de serie cíclico sobre los tokens de marca --chart-1..5 (theme.css). */
export function getSeriesColor(index: number): string {
  return `var(--chart-${(index % SERIES_COUNT) + 1})`;
}

/**
 * Color de celda de heatmap interpolado entre --muted y --chart-1 vía
 * color-mix() de CSS (mismo mecanismo que ya usa theme.css para las
 * superficies), sin depender de parsear colores en JS.
 */
export function heatmapCellColor(value: number, min: number, max: number): string {
  const pct = max > min ? Math.round(((value - min) / (max - min)) * 100) : 100;
  const clamped = Math.min(100, Math.max(0, pct));
  return `color-mix(in oklab, var(--chart-1) ${clamped}%, var(--muted))`;
}
