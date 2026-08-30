"use client";

import { FilterPanel } from "@/components/charts/filter-panel";
import type { FilterRowsParams, TransformColumn } from "@/lib/transformations/types";

export function FilterRowsEditor({
  value,
  onChange,
  columns,
}: {
  value: FilterRowsParams;
  onChange: (value: FilterRowsParams) => void;
  columns: TransformColumn[];
}) {
  return (
    <FilterPanel filters={value.filters} columns={columns} onChange={(filters) => onChange({ filters })} />
  );
}
