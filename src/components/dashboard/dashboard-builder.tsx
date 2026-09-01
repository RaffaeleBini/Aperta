"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContextProvider } from "@/components/drag-drop/dnd-context-provider";
import { WidgetCard } from "./widget-card";
import { WidgetPickerDialog } from "./widget-picker-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { DashboardItemRecord, DashboardItemSize, DashboardRecord } from "@/lib/dashboards/types";

export function DashboardBuilder({
  dashboard,
  initialItems,
}: {
  dashboard: DashboardRecord;
  initialItems: DashboardItemRecord[];
}) {
  const t = useTranslations("dashboard");
  const [items, setItems] = useState(initialItems);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handlePick(itemType: "chart" | "pivot", itemId: string) {
    setPickerOpen(false);
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setItems(json.items);
    } catch {
      toast.error(t("errors.addFailed"));
    }
  }

  async function handleChangeSize(itemId: string, size: DashboardItemSize) {
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, size } : i)));
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setItems(json.items);
    } catch {
      setItems(previous);
      toast.error(t("errors.updateFailed"));
    }
  }

  async function handleRemove(itemId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}/items/${itemId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setItems(json.items);
    } catch {
      setItems(previous);
      toast.error(t("errors.removeFailed"));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered);
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}/items/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds: reordered.map((i) => i.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error();
      setItems(json.items);
    } catch {
      setItems(previous);
      toast.error(t("errors.reorderFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">{dashboard.name}</h1>
        <Button onClick={() => setPickerOpen(true)}>
          <Plus className="size-4" />
          {t("addWidget")}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noWidgets")}</p>
      ) : (
        <DndContextProvider onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <WidgetCard
                  key={item.id}
                  dashboardId={dashboard.id}
                  item={item}
                  onChangeSize={(size) => handleChangeSize(item.id, size)}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContextProvider>
      )}

      <WidgetPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onPick={handlePick} />
    </div>
  );
}
