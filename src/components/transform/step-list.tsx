"use client";

import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContextProvider } from "@/components/drag-drop/dnd-context-provider";
import { StepListItem } from "./step-list-item";
import type { TransformationRecord } from "@/lib/transformations/transformations";

export function StepList({
  steps,
  selectedStepId,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
}: {
  steps: TransformationRecord[];
  selectedStepId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (step: TransformationRecord) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedStepIds: string[]) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(steps, oldIndex, newIndex).map((s) => s.id));
  }

  return (
    <DndContextProvider onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5">
          {steps.map((step, i) => (
            <StepListItem
              key={step.id}
              step={step}
              index={i}
              isSelected={step.id === selectedStepId}
              onSelect={() => onSelect(step.id === selectedStepId ? null : step.id)}
              onEdit={() => onEdit(step)}
              onDelete={() => onDelete(step.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContextProvider>
  );
}
