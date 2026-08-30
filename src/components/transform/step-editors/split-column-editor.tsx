"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SplitColumnParams, TransformColumn } from "@/lib/transformations/types";

export function SplitColumnEditor({
  value,
  onChange,
  columns,
}: {
  value: SplitColumnParams;
  onChange: (value: SplitColumnParams) => void;
  columns: TransformColumn[];
}) {
  const t = useTranslations("transform.editors.splitColumn");

  function updateOutputName(index: number, name: string) {
    onChange({
      ...value,
      outputNames: value.outputNames.map((n, i) => (i === index ? name : n)),
    });
  }

  function removeOutputName(index: number) {
    onChange({ ...value, outputNames: value.outputNames.filter((_, i) => i !== index) });
  }

  function addOutputName() {
    onChange({ ...value, outputNames: [...value.outputNames, `${value.column}_${value.outputNames.length + 1}`] });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
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
          <Label htmlFor="split-delimiter">{t("delimiter")}</Label>
          <Input
            id="split-delimiter"
            value={value.delimiter}
            onChange={(e) => onChange({ ...value, delimiter: e.target.value })}
            placeholder=","
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("outputNames")}</Label>
        {value.outputNames.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input className="h-8" value={name} onChange={(e) => updateOutputName(i, e.target.value)} />
            <Button variant="ghost" size="icon" className="size-8" onClick={() => removeOutputName(i)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-fit" onClick={addOutputName}>
          <Plus className="size-3.5" />
          {t("addOutput")}
        </Button>
      </div>
    </div>
  );
}
