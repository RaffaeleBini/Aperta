"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { summarizeStep } from "@/lib/transformations/step-summary";
import { toTransformStep, type TransformationRecord } from "@/lib/transformations/types";

export function StepListItem({
  step,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  step: TransformationRecord;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("transform");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const summary = summarizeStep(toTransformStep(step));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm cursor-pointer",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={onSelect}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground shrink-0"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="text-xs text-muted-foreground shrink-0">{index + 1}.</span>
      <span className="flex-1 truncate">{t(`summary.${summary.key}`, summary.values)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
