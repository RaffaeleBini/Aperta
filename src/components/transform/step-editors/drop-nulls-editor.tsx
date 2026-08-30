"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { DropNullsParams, TransformColumn } from "@/lib/transformations/types";

export function DropNullsEditor({
  value,
  onChange,
  columns,
}: {
  value: DropNullsParams;
  onChange: (value: DropNullsParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.dropNulls");

  function toggleColumn(name: string) {
    const isSelected = value.columns.includes(name);
    onChange({
      columns: isSelected ? value.columns.filter((c) => c !== name) : [...value.columns, name],
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{t("columns")}</Label>
      <div className="flex flex-wrap gap-1.5">
        {columns.map((c) => (
          <Badge
            key={c.name}
            variant={value.columns.includes(c.name) ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => toggleColumn(c.name)}
          >
            {c.name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
