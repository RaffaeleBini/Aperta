"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { StepList } from "./step-list";
import { AddStepMenu } from "./add-step-menu";
import { StepEditorDialog } from "./step-editor-dialog";
import { TransformPreviewTable } from "./transform-preview-table";
import { DatasetTable } from "@/components/data-profile/dataset-table";
import type { JoinableDataset } from "./step-editors/join-editor";
import type { StepType, TransformColumn } from "@/lib/transformations/types";
import type { TransformationRecord } from "@/lib/transformations/transformations";

interface DialogState {
  mode: "add" | "edit";
  stepType: StepType;
  stepId?: string;
  upToPosition?: number;
  initialParams?: Record<string, unknown>;
  columns: TransformColumn[];
}

export function TransformBuilder({
  datasetId,
  initialColumns,
  initialSteps,
  otherDatasets,
}: {
  datasetId: string;
  initialColumns: TransformColumn[];
  initialSteps: TransformationRecord[];
  otherDatasets: JoinableDataset[];
}) {
  const t = useTranslations("transform");
  const [steps, setSteps] = useState(initialSteps);
  const [currentColumns, setCurrentColumns] = useState(initialColumns);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<{
    columns: TransformColumn[];
    rows: Record<string, unknown>[];
    totalRows: number;
  } | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  async function refreshColumns() {
    const res = await fetch(`/api/datasets/${datasetId}`);
    const json = await res.json();
    if (json.dataset) setCurrentColumns(json.dataset.schema_json);
    // La tabla completa (DatasetTable) cachea sus filas en su propio estado
    // interno; forzar un remount es la forma más simple de que refleje la
    // tabla de trabajo recién regenerada en vez de datos obsoletos.
    setTableRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    if (!selectedStepId) return;
    const step = steps.find((s) => s.id === selectedStepId);
    if (!step) return;

    let cancelled = false;
    fetch(`/api/datasets/${datasetId}/transformations/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToPosition: step.position + 1 }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setSelectedPreview(json);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStepId, steps, datasetId]);

  async function openAddDialog(stepType: StepType) {
    setDialog({ mode: "add", stepType, upToPosition: steps.length, columns: currentColumns });
  }

  async function openEditDialog(step: TransformationRecord) {
    const res = await fetch(`/api/datasets/${datasetId}/transformations/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upToPosition: step.position }),
    });
    const json = await res.json();
    setDialog({
      mode: "edit",
      stepType: step.step_type,
      stepId: step.id,
      upToPosition: step.position,
      initialParams: step.params_json,
      columns: json.columns ?? currentColumns,
    });
  }

  async function handleSaveDialog(params: Record<string, unknown>) {
    if (!dialog) return;
    const url =
      dialog.mode === "add"
        ? `/api/datasets/${datasetId}/transformations`
        : `/api/datasets/${datasetId}/transformations/${dialog.stepId}`;
    const res = await fetch(url, {
      method: dialog.mode === "add" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dialog.mode === "add" ? { stepType: dialog.stepType, params } : { params }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(typeof json.error === "string" ? json.error : t("errors.invalidStep"));
    }
    setSteps(json.steps);
    await refreshColumns();
    toast.success(t("stepSaved"));
  }

  async function handleDelete(stepId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/datasets/${datasetId}/transformations/${stepId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : t("errors.deleteFailed"));
      setSteps(json.steps);
      if (selectedStepId === stepId) setSelectedStepId(null);
      await refreshColumns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.deleteFailed"));
    }
  }

  async function handleReorder(orderedStepIds: string[]) {
    const previous = steps;
    try {
      const res = await fetch(`/api/datasets/${datasetId}/transformations/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedStepIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : t("errors.reorderFailed"));
      setSteps(json.steps);
      await refreshColumns();
    } catch (err) {
      setSteps(previous);
      toast.error(err instanceof Error ? err.message : t("errors.reorderFailed"));
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 p-6">
      <div className="flex flex-col gap-3">
        <AddStepMenu onSelect={openAddDialog} />
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSteps")}</p>
        ) : (
          <StepList
            steps={steps}
            selectedStepId={selectedStepId}
            onSelect={setSelectedStepId}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onReorder={handleReorder}
          />
        )}
      </div>

      <div className="rounded-md border p-4 min-h-96">
        {selectedStepId && selectedPreview ? (
          <TransformPreviewTable
            columns={selectedPreview.columns}
            rows={selectedPreview.rows}
            totalRows={selectedPreview.totalRows}
          />
        ) : (
          <DatasetTable
            key={tableRefreshKey}
            datasetId={datasetId}
            columns={currentColumns.map((c) => c.name)}
          />
        )}
      </div>

      {dialog && (
        <StepEditorDialog
          key={dialog.stepId ?? `new-${dialog.stepType}`}
          open={Boolean(dialog)}
          onOpenChange={(open) => !open && setDialog(null)}
          stepType={dialog.stepType}
          datasetId={datasetId}
          columns={dialog.columns}
          otherDatasets={otherDatasets}
          upToPosition={dialog.upToPosition}
          initialParams={dialog.initialParams}
          onSave={handleSaveDialog}
        />
      )}
    </div>
  );
}
