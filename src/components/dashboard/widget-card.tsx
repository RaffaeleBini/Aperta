"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartCanvas } from "@/components/charts/chart-canvas";
import { PivotPreviewTable } from "@/components/pivot/pivot-preview-table";
import { cn } from "@/lib/utils";
import type { BuiltChartQuery } from "@/lib/charts/query-builder";
import type { ChartRecord } from "@/lib/charts/charts";
import type { PivotRecord } from "@/lib/pivot/pivots";
import type { DashboardItemRecord, DashboardItemSize } from "@/lib/dashboards/types";

type RenderData =
  | { itemType: "chart"; chart: ChartRecord; rows: Record<string, unknown>[]; columnMap: BuiltChartQuery["columnMap"] }
  | { itemType: "pivot"; pivot: PivotRecord; columns: string[]; rows: Record<string, unknown>[] };

const SIZE_SPAN: Record<DashboardItemSize, string> = {
  small: "col-span-1",
  medium: "col-span-1 md:col-span-2",
  large: "col-span-1 md:col-span-3",
};

const SIZES: DashboardItemSize[] = ["small", "medium", "large"];

export function WidgetCard({
  dashboardId,
  item,
  onChangeSize,
  onRemove,
}: {
  dashboardId: string;
  item: DashboardItemRecord;
  onChangeSize: (size: DashboardItemSize) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("dashboard");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const [data, setData] = useState<RenderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboards/${dashboardId}/items/${item.id}/render`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof json.error === "string" ? json.error : t("widgetMissing"));
          return;
        }
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(t("widgetMissing"));
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardId, item.id, t]);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={cn("flex flex-col rounded-md border bg-card", SIZE_SPAN[item.size])}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button type="button" className="cursor-grab touch-none text-muted-foreground" {...listeners} {...attributes}>
          <GripVertical className="size-4" />
        </button>
        <span className="flex-1 truncate text-sm font-medium">
          {data?.itemType === "chart" ? data.chart.name : data?.itemType === "pivot" ? data.pivot.name : "…"}
        </span>
        <Select value={item.size} onValueChange={(v) => onChangeSize(v as DashboardItemSize)}>
          <SelectTrigger size="sm" className="h-7 text-xs w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`size.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="size-7" onClick={onRemove}>
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="h-72 p-3 overflow-auto">
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{t("loadingWidget")}</p>
        ) : data.itemType === "chart" ? (
          <ChartCanvas config={data.chart.config_json} rows={data.rows} columnMap={data.columnMap} />
        ) : (
          <PivotPreviewTable columns={data.columns} rows={data.rows} />
        )}
      </div>
    </div>
  );
}
