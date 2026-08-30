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
import type { RenameColumnParams, TransformColumn } from "@/lib/transformations/types";

export function RenameColumnEditor({
  value,
  onChange,
  columns,
}: {
  value: RenameColumnParams;
  onChange: (value: RenameColumnParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.renameColumn");

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
        <Label htmlFor="rename-new-name">{t("newName")}</Label>
        <Input
          id="rename-new-name"
          value={value.newName}
          onChange={(e) => onChange({ ...value, newName: e.target.value })}
        />
      </div>
    </div>
  );
}
