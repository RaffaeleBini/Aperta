"use client";

import { useTranslations } from "next-intl";
import { FieldChip } from "./field-chip";
import { classifyField } from "@/lib/charts/field-kind";
import { shelvesForType } from "@/lib/charts/chart-types";
import type { ChartType, ShelfName } from "@/lib/charts/types";

export interface FieldListProps {
  columns: { name: string; type: string }[];
  chartType: ChartType;
  onAssign: (field: string, shelf: ShelfName) => void;
}

export function FieldList({ columns, chartType, onAssign }: FieldListProps) {
  const t = useTranslations("charts.builder");
  const shelves = shelvesForType(chartType);
  const applicableShelves = shelves.map((shelf) => ({ shelf, label: t(`shelves.${shelf}`) }));

  const dimensions = columns.filter((c) => classifyField(c.type) === "dimension");
  const measures = columns.filter((c) => classifyField(c.type) === "measure");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("dimensions")}</p>
        <div className="flex flex-col gap-1.5">
          {dimensions.map((col) => (
            <FieldChip
              key={col.name}
              name={col.name}
              type={col.type}
              applicableShelves={applicableShelves}
              onAssign={(shelf) => onAssign(col.name, shelf)}
              assignLabel={t("assignTo")}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("measures")}</p>
        <div className="flex flex-col gap-1.5">
          {measures.map((col) => (
            <FieldChip
              key={col.name}
              name={col.name}
              type={col.type}
              applicableShelves={applicableShelves}
              onAssign={(shelf) => onAssign(col.name, shelf)}
              assignLabel={t("assignTo")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
