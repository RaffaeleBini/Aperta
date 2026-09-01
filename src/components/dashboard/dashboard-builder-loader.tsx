"use client";

import dynamic from "next/dynamic";

// dnd-kit + Recharts solo se cargan en la ruta del lienzo de un dashboard.
export const DashboardBuilderClient = dynamic(
  () => import("./dashboard-builder").then((m) => m.DashboardBuilder),
  { ssr: false }
);
