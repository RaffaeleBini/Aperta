"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CalculatedColumnParams } from "@/lib/transformations/types";

export function CalculatedColumnEditor({
  value,
  onChange,
}: {
  value: CalculatedColumnParams;
  onChange: (value: CalculatedColumnParams) => void;
}) {
  const t = useTranslations("transform.editors.calculatedColumn");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="calc-name">{t("name")}</Label>
        <Input
          id="calc-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="calc-expression">{t("expression")}</Label>
        <Textarea
          id="calc-expression"
          className="font-mono text-sm"
          rows={3}
          placeholder="precio * cantidad"
          value={value.expression}
          onChange={(e) => onChange({ ...value, expression: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
    </div>
  );
}
