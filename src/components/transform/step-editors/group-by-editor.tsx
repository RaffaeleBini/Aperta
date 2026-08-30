"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGG_FUNCTIONS } from "@/lib/sql/aggregations";
import type { GroupByParams, TransformColumn } from "@/lib/transformations/types";

export function GroupByEditor({
  value,
  onChange,
  columns,
}: {
  value: GroupByParams;
  onChange: (value: GroupByParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.groupBy");
  const tAgg = useTranslations("charts.builder.aggregation");

  function toggleGroupColumn(name: string) {
    const isSelected = value.groupColumns.includes(name);
    onChange({
      ...value,
      groupColumns: isSelected
        ? value.groupColumns.filter((c) => c !== name)
        : [...value.groupColumns, name],
    });
  }

  function updateAggregation(index: number, patch: Partial<GroupByParams["aggregations"][number]>) {
    onChange({
      ...value,
      aggregations: value.aggregations.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    });
  }

  function removeAggregation(index: number) {
    onChange({ ...value, aggregations: value.aggregations.filter((_, i) => i !== index) });
  }

  function addAggregation() {
    if (columns.length === 0) return;
    onChange({
      ...value,
      aggregations: [
        ...value.aggregations,
        { column: columns[0].name, fn: "sum", outputName: `${columns[0].name}_sum` },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>{t("groupColumns")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((c) => (
            <Badge
              key={c.name}
              variant={value.groupColumns.includes(c.name) ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => toggleGroupColumn(c.name)}
            >
              {c.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("aggregations")}</Label>
        {value.aggregations.map((agg, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Select value={agg.column} onValueChange={(column) => updateAggregation(i, { column })}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agg.fn} onValueChange={(fn) => updateAggregation(i, { fn: fn as typeof agg.fn })}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGG_FUNCTIONS.map((fn) => (
                  <SelectItem key={fn} value={fn}>
                    {tAgg(fn)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 w-36"
              value={agg.outputName}
              onChange={(e) => updateAggregation(i, { outputName: e.target.value })}
              placeholder={t("outputName")}
            />
            <Button variant="ghost" size="icon" className="size-8" onClick={() => removeAggregation(i)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-fit" onClick={addAggregation}>
          <Plus className="size-3.5" />
          {t("addAggregation")}
        </Button>
      </div>
    </div>
  );
}
