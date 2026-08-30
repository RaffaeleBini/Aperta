"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DUCKDB_TYPE_WHITELIST } from "@/lib/transformations/types";
import type { ChangeTypeParams, TransformColumn } from "@/lib/transformations/types";

export function ChangeTypeEditor({
  value,
  onChange,
  columns,
}: {
  value: ChangeTypeParams;
  onChange: (value: ChangeTypeParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.changeType");

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
                {c.name} ({c.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{t("newType")}</Label>
        <Select
          value={value.newType}
          onValueChange={(newType) => onChange({ ...value, newType: newType as ChangeTypeParams["newType"] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("newType")} />
          </SelectTrigger>
          <SelectContent>
            {DUCKDB_TYPE_WHITELIST.map((typeName) => (
              <SelectItem key={typeName} value={typeName}>
                {typeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
