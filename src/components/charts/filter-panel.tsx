"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterRow } from "./filter-row";
import type { ChartFilter } from "@/lib/charts/types";

export function FilterPanel({
  filters,
  columns,
  onChange,
}: {
  filters: ChartFilter[];
  columns: { name: string; type: string }[];
  onChange: (filters: ChartFilter[]) => void;
}) {
  const t = useTranslations("charts.builder.filters");

  function updateAt(index: number, filter: ChartFilter) {
    onChange(filters.map((f, i) => (i === index ? filter : f)));
  }

  function removeAt(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  function addFilter() {
    if (columns.length === 0) return;
    onChange([...filters, { field: columns[0].name, op: "eq", value: "" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {filters.map((filter, i) => (
        <FilterRow
          key={i}
          filter={filter}
          columns={columns}
          onChange={(f) => updateAt(i, f)}
          onRemove={() => removeAt(i)}
        />
      ))}
      <Button variant="outline" size="sm" className="w-fit" onClick={addFilter}>
        <Plus className="size-3.5" />
        {t("addFilter")}
      </Button>
    </div>
  );
}
