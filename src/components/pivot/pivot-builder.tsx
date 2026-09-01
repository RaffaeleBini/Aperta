"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { DragEndEvent } from "@dnd-kit/core";
import { useRouter } from "@/i18n/navigation";
import { DndContextProvider } from "@/components/drag-drop/dnd-context-provider";
import { FilterPanel } from "@/components/charts/filter-panel";
import { PivotFieldList } from "./pivot-field-list";
import { PivotShelfPanel } from "./pivot-shelf-panel";
import { PivotPreviewTable } from "./pivot-preview-table";
import { SavePivotDialog } from "./save-pivot-dialog";
import { Button } from "@/components/ui/button";
import { classifyField } from "@/lib/charts/field-kind";
import { PIVOT_SHELVES } from "@/lib/pivot/pivot-shelves";
import { emptyPivotConfig } from "@/lib/pivot/types";
import type { AggFn } from "@/lib/sql/aggregations";
import type {
  DateGranularity,
  PivotConfig,
  PivotField,
  PivotFilter,
  PivotShelfName,
  PivotValueField,
} from "@/lib/pivot/types";
import type { PivotRecord } from "@/lib/pivot/pivots";

type State = PivotConfig;

type Action =
  | { type: "SET_SHELF"; shelf: PivotShelfName; fields: PivotField[] | PivotValueField[] }
  | { type: "SET_FILTERS"; filters: PivotFilter[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_SHELF":
      return { ...state, [action.shelf]: action.fields };
    case "SET_FILTERS":
      return { ...state, filters: action.filters };
  }
}

const PREVIEW_DEBOUNCE_MS = 300;

export function PivotBuilder({
  datasetId,
  columns,
  initialPivot,
}: {
  datasetId: string;
  columns: { name: string; type: string }[];
  initialPivot?: PivotRecord;
}) {
  const t = useTranslations("pivot.builder");
  const router = useRouter();
  const columnsByName = useMemo(() => new Map(columns.map((c) => [c.name, c])), [columns]);

  const [state, dispatch] = useReducer(reducer, initialPivot?.config_json ?? emptyPivotConfig());
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const isComplete = state.values.length >= PIVOT_SHELVES.values.min;

  useEffect(() => {
    if (!isComplete) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/datasets/${datasetId}/pivots/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
          signal: controller.signal,
        });
        const json = await res.json();
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          setPreviewError(typeof json.error === "string" ? json.error : t("errors.loadError"));
          setPreview(null);
          return;
        }
        setPreview({ columns: json.columns, rows: json.rows });
        setPreviewError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setPreviewError(t("errors.loadError"));
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(state), datasetId, isComplete]);

  function defaultShelfField(shelfName: PivotShelfName, field: string): PivotField | PivotValueField {
    if (PIVOT_SHELVES[shelfName].role === "measure") {
      const type = columnsByName.get(field)?.type ?? "";
      return { field, agg: (classifyField(type) === "measure" ? "sum" : "count") as AggFn };
    }
    return { field };
  }

  function addFieldToShelf(shelfName: PivotShelfName, field: string) {
    const spec = PIVOT_SHELVES[shelfName];
    const current = state[shelfName];
    if (current.some((f) => f.field === field)) return;

    if (current.length >= spec.max) {
      toast.warning(t("errors.shelfFull", { shelf: t(`shelves.${shelfName}`) }));
      return;
    }

    const next = [...current, defaultShelfField(shelfName, field)];
    dispatch({ type: "SET_SHELF", shelf: shelfName, fields: next as never });
  }

  function removeFieldFromShelf(shelfName: PivotShelfName, field: string) {
    const next = state[shelfName].filter((f) => f.field !== field);
    dispatch({ type: "SET_SHELF", shelf: shelfName, fields: next as never });
  }

  function moveFieldBetweenShelves(fromShelf: PivotShelfName, toShelf: PivotShelfName, field: string) {
    if (fromShelf === toShelf) return;
    removeFieldFromShelf(fromShelf, field);
    addFieldToShelf(toShelf, field);
  }

  function reorderShelf(shelfName: PivotShelfName, fromField: string, toField: string) {
    const current = state[shelfName];
    const fromIndex = current.findIndex((f) => f.field === fromField);
    const toIndex = current.findIndex((f) => f.field === toField);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    dispatch({ type: "SET_SHELF", shelf: shelfName, fields: next as never });
  }

  function updateShelfField(
    shelfName: PivotShelfName,
    field: string,
    patch: Partial<{ agg: AggFn; dateGranularity: DateGranularity | undefined }>
  ) {
    const next = state[shelfName].map((f) => (f.field === field ? { ...f, ...patch } : f));
    dispatch({ type: "SET_SHELF", shelf: shelfName, fields: next as never });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { kind: "field"; field: string }
      | { kind: "pill"; shelf: PivotShelfName; field: string }
      | undefined;
    const overData = over.data.current as
      | { kind: "shelf"; shelf: PivotShelfName }
      | { kind: "pill"; shelf: PivotShelfName; field: string }
      | undefined;
    if (!activeData || !overData) return;

    if (activeData.kind === "field") {
      addFieldToShelf(overData.shelf, activeData.field);
      return;
    }

    if (activeData.shelf === overData.shelf) {
      if (overData.kind === "pill" && activeData.field !== overData.field) {
        reorderShelf(activeData.shelf, activeData.field, overData.field);
      }
    } else {
      moveFieldBetweenShelves(activeData.shelf, overData.shelf, activeData.field);
    }
  }

  async function handleSave(name: string) {
    setSaving(true);
    try {
      const isEdit = Boolean(initialPivot);
      const url = isEdit
        ? `/api/datasets/${datasetId}/pivots/${initialPivot!.id}`
        : `/api/datasets/${datasetId}/pivots`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config: state }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : t("errors.loadError"));
      toast.success(t("saved"));
      setSaveOpen(false);
      router.push(`/datasets/${datasetId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.loadError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DndContextProvider onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 p-6 h-full">
        <div className="flex items-center justify-end">
          <Button onClick={() => setSaveOpen(true)} disabled={!isComplete}>
            {t("save")}
          </Button>
        </div>

        <div className="grid grid-cols-[220px_260px_1fr] gap-4 flex-1 min-h-0">
          <div className="overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("fields")}</p>
            <PivotFieldList columns={columns} onAssign={(field, shelf) => addFieldToShelf(shelf, field)} />
          </div>

          <div className="overflow-y-auto">
            <PivotShelfPanel
              config={state}
              columns={columns}
              onChangeAgg={(shelf, field, agg) => updateShelfField(shelf, field, { agg })}
              onChangeGranularity={(shelf, field, granularity) =>
                updateShelfField(shelf, field, { dateGranularity: granularity })
              }
              onRemove={removeFieldFromShelf}
            />
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("shelves.filters")}</p>
              <FilterPanel
                filters={state.filters}
                columns={columns}
                onChange={(filters) => dispatch({ type: "SET_FILTERS", filters })}
              />
            </div>
          </div>

          <div className="rounded-md border p-4 min-h-80 overflow-auto">
            {isComplete && previewError ? (
              <p className="text-sm text-destructive">{previewError}</p>
            ) : isComplete && preview ? (
              <PivotPreviewTable columns={preview.columns} rows={preview.rows} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
            )}
          </div>
        </div>
      </div>

      <SavePivotDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        initialName={initialPivot?.name ?? ""}
        onSave={handleSave}
        saving={saving}
      />
    </DndContextProvider>
  );
}
