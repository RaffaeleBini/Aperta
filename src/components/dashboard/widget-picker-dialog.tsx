"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Table2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WidgetOption {
  id: string;
  name: string;
  dataset_id: string;
  dataset_name: string;
}

export function WidgetPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (itemType: "chart" | "pivot", itemId: string) => void;
}) {
  const t = useTranslations("dashboard");
  const [result, setResult] = useState<{ charts: WidgetOption[]; pivots: WidgetOption[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/widgets")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setResult({ charts: json.charts ?? [], pivots: json.pivots ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const charts = result?.charts ?? [];
  const pivots = result?.pivots ?? [];
  const loading = open && result === null;

  const groups = new Map<string, { datasetName: string; charts: WidgetOption[]; pivots: WidgetOption[] }>();
  for (const c of charts) {
    const g = groups.get(c.dataset_id) ?? { datasetName: c.dataset_name, charts: [], pivots: [] };
    g.charts.push(c);
    groups.set(c.dataset_id, g);
  }
  for (const p of pivots) {
    const g = groups.get(p.dataset_id) ?? { datasetName: p.dataset_name, charts: [], pivots: [] };
    g.pivots.push(p);
    groups.set(p.dataset_id, g);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addWidget")}</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">{t("loadingWidget")}</p>}

        {!loading && groups.size === 0 && (
          <p className="text-sm text-muted-foreground">{t("noWidgetsAvailable")}</p>
        )}

        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([datasetId, group]) => (
            <div key={datasetId}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.datasetName}</p>
              <div className="flex flex-col gap-1">
                {group.charts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm text-left hover:bg-accent/10"
                    onClick={() => onPick("chart", c.id)}
                  >
                    <BarChart3 className="size-3.5 text-muted-foreground" />
                    {c.name}
                  </button>
                ))}
                {group.pivots.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm text-left hover:bg-accent/10"
                    onClick={() => onPick("pivot", p.id)}
                  >
                    <Table2 className="size-3.5 text-muted-foreground" />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
