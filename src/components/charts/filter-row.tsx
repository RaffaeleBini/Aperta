"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChartFilter, FilterOp } from "@/lib/charts/types";

const FILTER_OPS: FilterOp[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
  "not_in",
  "is_null",
  "is_not_null",
];

function valueToText(value: ChartFilter["value"]): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export function FilterRow({
  filter,
  columns,
  onChange,
  onRemove,
}: {
  filter: ChartFilter;
  columns: { name: string; type: string }[];
  onChange: (filter: ChartFilter) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("charts.builder.filters");
  const needsValue = filter.op !== "is_null" && filter.op !== "is_not_null";
  const isMulti = filter.op === "in" || filter.op === "not_in";
  const isBetween = filter.op === "between";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filter.field} onValueChange={(field) => onChange({ ...filter, field })}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder={t("field")} />
        </SelectTrigger>
        <SelectContent>
          {columns.map((c) => (
            <SelectItem key={c.name} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filter.op} onValueChange={(op) => onChange({ ...filter, op: op as FilterOp, value: undefined })}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder={t("operator")} />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPS.map((op) => (
            <SelectItem key={op} value={op}>
              {t(`operators.${op}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {needsValue && !isBetween && (
        <Input
          className="h-8 w-40"
          placeholder={isMulti ? "a, b, c" : t("value")}
          defaultValue={valueToText(filter.value)}
          onBlur={(e) => {
            const raw = e.target.value;
            onChange({
              ...filter,
              value: isMulti ? raw.split(",").map((v) => v.trim()).filter(Boolean) : raw,
            });
          }}
        />
      )}

      {isBetween && (
        <>
          <Input
            className="h-8 w-24"
            placeholder="min"
            defaultValue={Array.isArray(filter.value) ? String(filter.value[0] ?? "") : ""}
            onBlur={(e) => {
              const hi = Array.isArray(filter.value) ? filter.value[1] : "";
              onChange({ ...filter, value: [e.target.value, hi ?? ""] });
            }}
          />
          <Input
            className="h-8 w-24"
            placeholder="max"
            defaultValue={Array.isArray(filter.value) ? String(filter.value[1] ?? "") : ""}
            onBlur={(e) => {
              const lo = Array.isArray(filter.value) ? filter.value[0] : "";
              onChange({ ...filter, value: [lo ?? "", e.target.value] });
            }}
          />
        </>
      )}

      <Button variant="ghost" size="icon" className="size-8" onClick={onRemove}>
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
