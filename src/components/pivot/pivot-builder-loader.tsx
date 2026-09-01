"use client";

import dynamic from "next/dynamic";

// dnd-kit solo se carga en las rutas del constructor de tablas dinámicas.
export const PivotBuilderClient = dynamic(
  () => import("./pivot-builder").then((m) => m.PivotBuilder),
  { ssr: false }
);
