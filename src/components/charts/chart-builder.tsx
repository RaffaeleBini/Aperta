"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { DragEndEvent } from "@dnd-kit/core";
import { useRouter } from "@/i18n/navigation";
import { DndContextProvider } from "@/components/drag-drop/dnd-context-provider";
import { FieldList } from "@/components/drag-drop/field-list";
import { ShelfPanel } from "@/components/drag-drop/shelf-panel";
import { ChartTypeSelector } from "./chart-type-selector";
import { FilterPanel } from "./filter-panel";
import { ChartCanvas } from "./chart-canvas";
import { SaveChartDialog } from "./save-chart-dialog";
import { Button } from "@/components/ui/button";
import { CHART_TYPE_SHELVES } from "@/lib/charts/chart-types";
import { classifyField } from "@/lib/charts/field-kind";
import { remapShelvesForType } from "@/lib/charts/chart-type-transition";
import type {
  AggFn,
  ChartConfig,
  ChartFilter,
  ChartType,
  DateGranularity,
  ShelfName,
} from "@/lib/charts/types";
import type { BuiltChartQuery } from "@/lib/charts/query-builder";
import type { ChartRecord } from "@/lib/charts/charts";

type State = ChartConfig;

type Action =
  | { type: "SET_TYPE_AND_SHELVES"; chartType: ChartType; shelves: ChartConfig["shelves"] }
  | { type: "SET_SHELVES"; shelves: ChartConfig["shelves"] }
  | { type: "SET_FILTERS"; filters: ChartFilter[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TYPE_AND_SHELVES":
      return { ...state, chartType: action.chartType, shelves: action.shelves };
    case "SET_SHELVES":
      return { ...state, shelves: action.shelves };
    case "SET_FILTERS":
      return { ...state, filters: action.filters };
  }
}

const PREVIEW_DEBOUNCE_MS = 300;

export function ChartBuilder({
  datasetId,
  columns,
  initialChart,
}: {
  datasetId: string;
  columns: { name: string; type: string }[];
  initialChart?: ChartRecord;
}) {
  const t = useTranslations("charts.builder");
  const router = useRouter();
  const columnsByName = useMemo(() => new Map(columns.map((c) => [c.name, c])), [columns]);

  const [state, dispatch] = useReducer(
    reducer,
    initialChart?.config_json ?? { version: 1, chartType: "bar", shelves: {}, filters: [] }
  );
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{
    rows: Record<string, unknown>[];
    columnMap: BuiltChartQuery["columnMap"];
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const spec = CHART_TYPE_SHELVES[state.chartType];
  const isComplete = Object.entries(spec).every(
    ([shelf, shelfSpec]) => (state.shelves[shelf as ShelfName]?.length ?? 0) >= shelfSpec.min
  );

  useEffect(() => {
    if (!isComplete) return;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/datasets/${datasetId}/charts/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
          signal: controller.signal,
        });
        const json = await res.json();
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          setPreviewError(t("errors.loadError"));
          setPreview(null);
          return;
        }
        setPreview({ rows: json.rows, columnMap: json.columnMap });
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

  function defaultShelfField(shelfName: ShelfName, field: string) {
    const shelfSpec = spec[shelfName]!;
    if (shelfSpec.role === "measure") {
      const type = columnsByName.get(field)?.type ?? "";
      return { field, agg: (classifyField(type) === "measure" ? "sum" : "count") as AggFn };
    }
    return { field };
  }

  function addFieldToShelf(shelfName: ShelfName, field: string) {
    const shelfSpec = spec[shelfName];
    if (!shelfSpec) return;

    const current = state.shelves[shelfName] ?? [];
    if (current.some((f) => f.field === field)) return;

    let next: ChartConfig["shelves"][ShelfName];
    if (shelfSpec.max === 1) {
      next = [defaultShelfField(shelfName, field)];
    } else if (current.length >= shelfSpec.max) {
      toast.warning(t("errors.shelfFull", { shelf: t(`shelves.${shelfName}`) }));
      return;
    } else {
      next = [...current, defaultShelfField(shelfName, field)];
    }

    dispatch({ type: "SET_SHELVES", shelves: { ...state.shelves, [shelfName]: next } });
  }

  function removeFieldFromShelf(shelfName: ShelfName, field: string) {
    const current = (state.shelves[shelfName] ?? []).filter((f) => f.field !== field);
    const nextShelves = { ...state.shelves };
    if (current.length > 0) nextShelves[shelfName] = current;
    else delete nextShelves[shelfName];
    dispatch({ type: "SET_SHELVES", shelves: nextShelves });
  }

  function moveFieldBetweenShelves(fromShelf: ShelfName, toShelf: ShelfName, field: string) {
    if (fromShelf === toShelf) return;
    removeFieldFromShelf(fromShelf, field);
    addFieldToShelf(toShelf, field);
  }

  function reorderShelf(shelfName: ShelfName, fromField: string, toField: string) {
    const current = state.shelves[shelfName] ?? [];
    const fromIndex = current.findIndex((f) => f.field === fromField);
    const toIndex = current.findIndex((f) => f.field === toField);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    dispatch({ type: "SET_SHELVES", shelves: { ...state.shelves, [shelfName]: next } });
  }

  function updateShelfField(shelfName: ShelfName, field: string, patch: Partial<{ agg: AggFn; dateGranularity: DateGranularity | undefined }>) {
    const current = state.shelves[shelfName] ?? [];
    const next = current.map((f) => (f.field === field ? { ...f, ...patch } : f));
    dispatch({ type: "SET_SHELVES", shelves: { ...state.shelves, [shelfName]: next } });
  }

  function handleChartTypeChange(nextType: ChartType) {
    const { shelves, droppedFields } = remapShelvesForType(state.chartType, nextType, state.shelves);
    dispatch({ type: "SET_TYPE_AND_SHELVES", chartType: nextType, shelves });
    if (droppedFields.length > 0) {
      toast.info(t("typeChangedWarning", { count: droppedFields.length }));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { kind: "field"; field: string }
      | { kind: "pill"; shelf: ShelfName; field: string }
      | undefined;
    const overData = over.data.current as
      | { kind: "shelf"; shelf: ShelfName }
      | { kind: "pill"; shelf: ShelfName; field: string }
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
      const isEdit = Boolean(initialChart);
      const url = isEdit
        ? `/api/datasets/${datasetId}/charts/${initialChart!.id}`
        : `/api/datasets/${datasetId}/charts`;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit ? { name, chartType: state.chartType, config: state } : { name, chartType: state.chartType, config: state }
        ),
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
        <div className="flex items-center justify-between">
          <ChartTypeSelector value={state.chartType} onChange={handleChartTypeChange} />
          <Button onClick={() => setSaveOpen(true)} disabled={!isComplete}>
            {t("save")}
          </Button>
        </div>

        <div className="grid grid-cols-[220px_260px_1fr] gap-4 flex-1 min-h-0">
          <div className="overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("fields")}</p>
            <FieldList
              columns={columns}
              chartType={state.chartType}
              onAssign={(field, shelf) => addFieldToShelf(shelf, field)}
            />
          </div>

          <div className="overflow-y-auto">
            <ShelfPanel
              chartType={state.chartType}
              shelves={state.shelves}
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

          <div className="rounded-md border p-4 min-h-80">
            {isComplete && previewError ? (
              <p className="text-sm text-destructive">{previewError}</p>
            ) : (
              <ChartCanvas
                config={state}
                rows={isComplete ? (preview?.rows ?? null) : null}
                columnMap={isComplete ? (preview?.columnMap ?? null) : null}
              />
            )}
          </div>
        </div>
      </div>

      <SaveChartDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        initialName={initialChart?.name ?? ""}
        onSave={handleSave}
        saving={saving}
      />
    </DndContextProvider>
  );
}
