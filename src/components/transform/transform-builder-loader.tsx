"use client";

import dynamic from "next/dynamic";

// dnd-kit solo se carga en la ruta del panel de transformaciones.
export const TransformBuilderClient = dynamic(
  () => import("./transform-builder").then((m) => m.TransformBuilder),
  { ssr: false }
);
