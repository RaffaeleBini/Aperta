"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGG_FUNCTIONS } from "@/lib/sql/aggregations";
import type { AggFn } from "@/lib/sql/aggregations";
import type { DateGranularity, PivotField, PivotShelfName, PivotValueField } from "@/lib/pivot/types";

const DATE_GRANULARITIES: DateGranularity[] = ["year", "quarter", "month", "day"];

export function PivotShelfFieldPill({
  shelf,
  shelfField,
  role,
  isTemporal,
  onChangeAgg,
  onChangeGranularity,
  onRemove,
}: {
  shelf: PivotShelfName;
  shelfField: PivotField | PivotValueField;
  role: "dimension" | "measure";
  isTemporal: boolean;
  onChangeAgg: (agg: AggFn) => void;
  onChangeGranularity: (granularity: DateGranularity | undefined) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("pivot.builder");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `pill:${shelf}:${shelfField.field}`,
    data: { kind: "pill", shelf, field: shelfField.field },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-sm"
    >
      <button type="button" className="cursor-grab touch-none truncate flex-1 text-left" {...listeners} {...attributes}>
        {shelfField.field}
      </button>

      {role === "measure" && (
        <Select
          value={(shelfField as PivotValueField).agg}
          onValueChange={(v) => onChangeAgg(v as AggFn)}
        >
          <SelectTrigger size="sm" className="h-7 text-xs w-auto">
            <SelectValue placeholder={t("aggregation.sum")} />
          </SelectTrigger>
          <SelectContent>
            {AGG_FUNCTIONS.map((agg) => (
              <SelectItem key={agg} value={agg}>
                {t(`aggregation.${agg}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {role === "dimension" && isTemporal && (
        <Select
          value={(shelfField as PivotField).dateGranularity ?? "none"}
          onValueChange={(v) => onChangeGranularity(v === "none" ? undefined : (v as DateGranularity))}
        >
          <SelectTrigger size="sm" className="h-7 text-xs w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {DATE_GRANULARITIES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={onRemove}>
        <X className="size-3" />
      </Button>
    </div>
  );
}
