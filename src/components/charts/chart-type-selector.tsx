"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CHART_TYPES } from "@/lib/charts/chart-types";
import { CHART_TYPE_ICONS } from "@/lib/charts/chart-type-icons";
import type { ChartType } from "@/lib/charts/types";

export function ChartTypeSelector({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (type: ChartType) => void;
}) {
  const t = useTranslations("charts.builder.types");

  return (
    <div className="flex gap-1">
      {CHART_TYPES.map((type) => {
        const Icon = CHART_TYPE_ICONS[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs",
              value === type ? "border-primary bg-primary/10" : "hover:bg-accent/10"
            )}
          >
            <Icon className="size-4" />
            {t(type)}
          </button>
        );
      })}
    </div>
  );
}
