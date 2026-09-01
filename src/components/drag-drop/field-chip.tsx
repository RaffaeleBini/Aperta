"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface FieldChipProps {
  name: string;
  type: string;
  applicableShelves: { shelf: string; label: string }[];
  onAssign: (shelf: string) => void;
  assignLabel: string;
}

export function FieldChip({ name, type, applicableShelves, onAssign, assignLabel }: FieldChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `field:${name}`,
    data: { kind: "field", field: name },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-1 rounded-md border bg-card px-2 py-1.5 text-sm"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <button
        type="button"
        className="flex flex-1 min-w-0 items-center gap-1.5 cursor-grab touch-none text-left"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">{name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{type}</span>
      </button>

      {applicableShelves.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              aria-label={assignLabel}
            >
              +
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {applicableShelves.map(({ shelf, label }) => (
              <DropdownMenuItem key={shelf} onSelect={() => onAssign(shelf)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
