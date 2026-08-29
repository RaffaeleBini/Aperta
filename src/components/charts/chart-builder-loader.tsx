"use client";

import dynamic from "next/dynamic";

// Recharts + dnd-kit solo se cargan en las rutas del constructor de gráficos,
// nunca en el bundle de las páginas de listado/perfilado ya existentes.
export const ChartBuilderClient = dynamic(
  () => import("./chart-builder").then((m) => m.ChartBuilder),
  { ssr: false }
);
