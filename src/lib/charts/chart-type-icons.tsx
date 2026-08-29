import {
  BarChart3,
  ChartLine,
  ChartPie,
  ChartScatter,
  Grid3x3,
  AreaChart as AreaChartIcon,
} from "lucide-react";
import type { ChartType } from "./types";

/**
 * Mapa de iconos por tipo de gráfico, en un módulo sin "use client": se
 * importa tanto desde componentes cliente (selector) como desde Server
 * Components (chart-list.tsx) — los componentes de lucide-react son seguros
 * en RSC, pero re-exportarlos a través de un módulo "use client" rompe su
 * uso desde el server (el export llega como referencia opaca, no la función).
 */
export const CHART_TYPE_ICONS: Record<ChartType, React.ComponentType<{ className?: string }>> = {
  bar: BarChart3,
  line: ChartLine,
  area: AreaChartIcon,
  scatter: ChartScatter,
  pie: ChartPie,
  heatmap: Grid3x3,
};
