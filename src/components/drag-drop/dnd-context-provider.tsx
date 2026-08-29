"use client";

import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DndContextProps } from "@dnd-kit/core";

/**
 * DndContext con sensores ya configurados (puntero + teclado), reutilizable
 * en cualquier superficie drag&drop de la app (constructor de gráficos aquí,
 * tablas dinámicas en Fase 4).
 */
export function DndContextProvider(props: DndContextProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  return <DndContext sensors={sensors} {...props} />;
}
