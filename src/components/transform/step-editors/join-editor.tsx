"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JoinParams, JoinType, TransformColumn } from "@/lib/transformations/types";

export interface JoinableDataset {
  id: string;
  name: string;
}

const JOIN_TYPES: JoinType[] = ["inner", "left", "right", "full"];

export function JoinEditor({
  value,
  onChange,
  columns,
  otherDatasets,
}: {
  value: JoinParams;
  onChange: (value: JoinParams) => void;
  columns: TransformColumn[];
  otherDatasets: JoinableDataset[];
}) {
  const t = useTranslations("transform.editors.join");
  const [otherColumns, setOtherColumns] = useState<TransformColumn[]>([]);

  useEffect(() => {
    if (!value.otherDatasetId) return;
    let cancelled = false;
    fetch(`/api/datasets/${value.otherDatasetId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setOtherColumns(json.dataset?.schema_json ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [value.otherDatasetId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>{t("otherDataset")}</Label>
        <Select
          value={value.otherDatasetId}
          onValueChange={(otherDatasetId) => onChange({ ...value, otherDatasetId, onRight: "" })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("otherDataset")} />
          </SelectTrigger>
          <SelectContent>
            {otherDatasets.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("joinType")}</Label>
        <Select
          value={value.joinType}
          onValueChange={(joinType) => onChange({ ...value, joinType: joinType as JoinType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOIN_TYPES.map((jt) => (
              <SelectItem key={jt} value={jt}>
                {t(`types.${jt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t("onLeft")}</Label>
          <Select value={value.onLeft} onValueChange={(onLeft) => onChange({ ...value, onLeft })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("onLeft")} />
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
          <Label>{t("onRight")}</Label>
          <Select
            value={value.onRight}
            onValueChange={(onRight) => onChange({ ...value, onRight })}
            disabled={!value.otherDatasetId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("onRight")} />
            </SelectTrigger>
            <SelectContent>
              {otherColumns.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
