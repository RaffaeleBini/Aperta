"use client";

import { useTranslations } from "next-intl";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Shelf } from "@/components/drag-drop/shelf";
import { PivotShelfFieldPill } from "./pivot-shelf-field-pill";
import { PIVOT_SHELF_ORDER, PIVOT_SHELVES } from "@/lib/pivot/pivot-shelves";
import { isTemporalField } from "@/lib/charts/field-kind";
import type { AggFn } from "@/lib/sql/aggregations";
import type { DateGranularity, PivotConfig, PivotShelfName } from "@/lib/pivot/types";

export function PivotShelfPanel({
  config,
  columns,
  onChangeAgg,
  onChangeGranularity,
  onRemove,
}: {
  config: PivotConfig;
  columns: { name: string; type: string }[];
  onChangeAgg: (shelf: PivotShelfName, field: string, agg: AggFn) => void;
  onChangeGranularity: (shelf: PivotShelfName, field: string, granularity: DateGranularity | undefined) => void;
  onRemove: (shelf: PivotShelfName, field: string) => void;
}) {
  const t = useTranslations("pivot.builder");
  const columnsByName = new Map(columns.map((c) => [c.name, c]));

  return (
    <div className="flex flex-col gap-4">
      {PIVOT_SHELF_ORDER.map((shelfName) => {
        const fields = config[shelfName];
        const role = PIVOT_SHELVES[shelfName].role;
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
                  <PivotShelfFieldPill
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
