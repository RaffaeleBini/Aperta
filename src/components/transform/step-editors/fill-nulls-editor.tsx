"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FillNullsParams, FillStrategy, TransformColumn } from "@/lib/transformations/types";

const STRATEGIES: FillStrategy[] = ["value", "mean", "median", "mode", "zero"];

export function FillNullsEditor({
  value,
  onChange,
  columns,
}: {
  value: FillNullsParams;
  onChange: (value: FillNullsParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.fillNulls");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>{t("column")}</Label>
        <Select value={value.column} onValueChange={(column) => onChange({ ...value, column })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("column")} />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("strategy")}</Label>
        <Select
          value={value.strategy}
          onValueChange={(strategy) => onChange({ ...value, strategy: strategy as FillStrategy })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STRATEGIES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`strategies.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.strategy === "value" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fill-value">{t("value")}</Label>
          <Input
            id="fill-value"
            value={value.value ?? ""}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
