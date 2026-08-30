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
import type { DropColumnParams, TransformColumn } from "@/lib/transformations/types";

export function DropColumnEditor({
  value,
  onChange,
  columns,
}: {
  value: DropColumnParams;
  onChange: (value: DropColumnParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.dropColumn");

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{t("column")}</Label>
      <Select value={value.column} onValueChange={(column) => onChange({ column })}>
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
  );
}
