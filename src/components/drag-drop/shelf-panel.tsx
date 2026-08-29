"use client";

import { useTranslations } from "next-intl";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Shelf } from "./shelf";
import { ShelfFieldPill } from "./shelf-field-pill";
import { CHART_TYPE_SHELVES, shelvesForType } from "@/lib/charts/chart-types";
import { isTemporalField } from "@/lib/charts/field-kind";
import type { AggFn, ChartConfig, ChartType, DateGranularity, ShelfName } from "@/lib/charts/types";

export function ShelfPanel({
  chartType,
  shelves,
  columns,
  onChangeAgg,
  onChangeGranularity,
  onRemove,
}: {
  chartType: ChartType;
  shelves: ChartConfig["shelves"];
  columns: { name: string; type: string }[];
  onChangeAgg: (shelf: ShelfName, field: string, agg: AggFn) => void;
  onChangeGranularity: (shelf: ShelfName, field: string, granularity: DateGranularity | undefined) => void;
  onRemove: (shelf: ShelfName, field: string) => void;
}) {
  const t = useTranslations("charts.builder");
  const spec = CHART_TYPE_SHELVES[chartType];
  const columnsByName = new Map(columns.map((c) => [c.name, c]));

  return (
    <div className="flex flex-col gap-4">
      {shelvesForType(chartType).map((shelfName) => {
        const fields = shelves[shelfName] ?? [];
        const role = spec[shelfName]!.role;
        const sortableIds = fields.map((f) => `pill:${shelfName}:${f.field}`);

        return (
          <Shelf
            key={shelfName}
            shelf={shelfName}
            label={t(`shelves.${shelfName}`)}
            hint={t("dropHint")}
            isEmpty={fields.length === 0}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5">
                {fields.map((shelfField) => (
                  <ShelfFieldPill
                    key={shelfField.field}
                    shelf={shelfName}
                    shelfField={shelfField}
                    role={role}
                    isTemporal={isTemporalField(columnsByName.get(shelfField.field)?.type ?? "")}
                    onChangeAgg={(agg) => onChangeAgg(shelfName, shelfField.field, agg)}
                    onChangeGranularity={(g) => onChangeGranularity(shelfName, shelfField.field, g)}
                    onRemove={() => onRemove(shelfName, shelfField.field)}
                  />
                ))}
              </div>
            </SortableContext>
          </Shelf>
        );
      })}
    </div>
  );
}
