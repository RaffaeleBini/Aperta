"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TransformPreviewTable } from "./transform-preview-table";
import { RenameColumnEditor } from "./step-editors/rename-column-editor";
import { DropColumnEditor } from "./step-editors/drop-column-editor";
import { ChangeTypeEditor } from "./step-editors/change-type-editor";
import { FilterRowsEditor } from "./step-editors/filter-rows-editor";
import { CalculatedColumnEditor } from "./step-editors/calculated-column-editor";
import { GroupByEditor } from "./step-editors/group-by-editor";
import { JoinEditor, type JoinableDataset } from "./step-editors/join-editor";
import { SplitColumnEditor } from "./step-editors/split-column-editor";
import { CombineColumnsEditor } from "./step-editors/combine-columns-editor";
import { FillNullsEditor } from "./step-editors/fill-nulls-editor";
import { DropNullsEditor } from "./step-editors/drop-nulls-editor";
import type { StepType, TransformColumn } from "@/lib/transformations/types";

function defaultParamsFor(stepType: StepType, columns: TransformColumn[]): Record<string, unknown> {
  const firstCol = columns[0]?.name ?? "";
  switch (stepType) {
    case "rename_column":
      return { column: firstCol, newName: "" };
    case "drop_column":
      return { column: firstCol };
    case "change_type":
      return { column: firstCol, newType: "VARCHAR" };
    case "filter_rows":
      return { filters: [] };
    case "calculated_column":
      return { name: "", expression: "" };
    case "group_by":
      return { groupColumns: [], aggregations: [] };
    case "join":
      return { otherDatasetId: "", joinType: "inner", onLeft: firstCol, onRight: "" };
    case "split_column":
      return { column: firstCol, delimiter: ",", outputNames: [`${firstCol}_1`, `${firstCol}_2`] };
    case "combine_columns":
      return { columns: [], separator: " ", outputName: "" };
    case "fill_nulls":
      return { column: firstCol, strategy: "value", value: "" };
    case "drop_nulls":
      return { columns: [] };
  }
}

export function StepEditorDialog({
  open,
  onOpenChange,
  stepType,
  datasetId,
  columns,
  otherDatasets,
  upToPosition,
  initialParams,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepType: StepType;
  datasetId: string;
  columns: TransformColumn[];
  otherDatasets: JoinableDataset[];
  upToPosition?: number;
  initialParams?: Record<string, unknown>;
  onSave: (params: Record<string, unknown>) => Promise<void>;
}) {
  const t = useTranslations("transform");
  const [params, setParams] = useState<Record<string, unknown>>(
    initialParams ?? defaultParamsFor(stepType, columns)
  );
  const [preview, setPreview] = useState<{
    columns: TransformColumn[];
    rows: Record<string, unknown>[];
    totalRows: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/datasets/${datasetId}/transformations/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upToPosition, draftStep: { stepType, params } }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          setError(typeof json.error === "string" ? json.error : t("errors.invalidStep"));
          setPreview(null);
          return;
        }
        setPreview(json);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(t("errors.loadError"));
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(params), stepType, datasetId, upToPosition]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(params);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadError"));
    } finally {
      setSaving(false);
    }
  }

  function renderEditor() {
    switch (stepType) {
      case "rename_column":
        return (
          <RenameColumnEditor
            value={params as never}
            onChange={(v) => setParams(v as unknown as Record<string, unknown>)}
            columns={columns}
          />
        );
      case "drop_column":
        return <DropColumnEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "change_type":
        return <ChangeTypeEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "filter_rows":
        return <FilterRowsEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "calculated_column":
        return <CalculatedColumnEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} />;
      case "group_by":
        return <GroupByEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "join":
        return (
          <JoinEditor
            value={params as never}
            onChange={(v) => setParams(v as unknown as Record<string, unknown>)}
            columns={columns}
            otherDatasets={otherDatasets}
          />
        );
      case "split_column":
        return <SplitColumnEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "combine_columns":
        return <CombineColumnsEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "fill_nulls":
        return <FillNullsEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
      case "drop_nulls":
        return <DropNullsEditor value={params as never} onChange={(v) => setParams(v as unknown as Record<string, unknown>)} columns={columns} />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(`stepTypes.${stepType}`)}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>{renderEditor()}</div>
          <div className="rounded-md border p-2 min-h-40 max-h-72 overflow-auto">
            {error ? (
              <p className="text-sm text-destructive p-2">{error}</p>
            ) : preview ? (
              <TransformPreviewTable columns={preview.columns} rows={preview.rows} totalRows={preview.totalRows} />
            ) : (
              <p className="text-sm text-muted-foreground p-2">{t("previewLoading")}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || Boolean(error) || !preview}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
