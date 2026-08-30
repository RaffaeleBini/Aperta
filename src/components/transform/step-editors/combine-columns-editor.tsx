"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { CombineColumnsParams, TransformColumn } from "@/lib/transformations/types";

export function CombineColumnsEditor({
  value,
  onChange,
  columns,
}: {
  value: CombineColumnsParams;
  onChange: (value: CombineColumnsParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.combineColumns");

  function toggleColumn(name: string) {
    const isSelected = value.columns.includes(name);
    onChange({
      ...value,
      columns: isSelected ? value.columns.filter((c) => c !== name) : [...value.columns, name],
    });
  }

  return (
    <div className="flex flex-col gap-3">
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="combine-separator">{t("separator")}</Label>
          <Input
            id="combine-separator"
            value={value.separator}
            onChange={(e) => onChange({ ...value, separator: e.target.value })}
            placeholder=" - "
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="combine-output">{t("outputName")}</Label>
          <Input
            id="combine-output"
            value={value.outputName}
            onChange={(e) => onChange({ ...value, outputName: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={value.dropOriginals ?? false}
          onCheckedChange={(checked) => onChange({ ...value, dropOriginals: checked === true })}
        />
        {t("dropOriginals")}
      </label>
    </div>
  );
}
