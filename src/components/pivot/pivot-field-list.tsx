"use client";

import { useTranslations } from "next-intl";
import { FieldChip } from "@/components/drag-drop/field-chip";
import { classifyField } from "@/lib/charts/field-kind";
import { PIVOT_SHELF_ORDER } from "@/lib/pivot/pivot-shelves";
import type { PivotShelfName } from "@/lib/pivot/types";

export function PivotFieldList({
  columns,
  onAssign,
}: {
  columns: { name: string; type: string }[];
  onAssign: (field: string, shelf: PivotShelfName) => void;
}) {
  const t = useTranslations("pivot.builder");
  const applicableShelves = PIVOT_SHELF_ORDER.map((shelf) => ({ shelf, label: t(`shelves.${shelf}`) }));

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
              onAssign={(shelf) => onAssign(col.name, shelf as PivotShelfName)}
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
              onAssign={(shelf) => onAssign(col.name, shelf as PivotShelfName)}
              assignLabel={t("assignTo")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
