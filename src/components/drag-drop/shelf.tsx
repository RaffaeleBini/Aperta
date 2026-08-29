"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ShelfName } from "@/lib/charts/types";

export function Shelf({
  shelf,
  label,
  hint,
  children,
  isEmpty,
}: {
  shelf: ShelfName;
  label: string;
  hint: string;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `shelf:${shelf}`,
    data: { kind: "shelf", shelf },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-14 rounded-md border border-dashed p-2 flex flex-col gap-1.5",
          isOver && "border-primary bg-primary/5"
        )}
      >
        {isEmpty ? <p className="text-xs text-muted-foreground italic">{hint}</p> : children}
      </div>
    </div>
  );
}
