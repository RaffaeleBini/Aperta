"use client";

import { useTranslations } from "next-intl";
import { NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportPivotNotebookLink({ datasetId, pivotId }: { datasetId: string; pivotId: string }) {
  const t = useTranslations("pivot");

  return (
    <Button variant="ghost" size="icon" className="size-8" asChild>
      <a
        href={`/api/datasets/${datasetId}/pivots/${pivotId}/notebook`}
        onClick={(e) => e.stopPropagation()}
        aria-label={t("exportNotebook")}
      >
        <NotebookText className="size-3.5" />
      </a>
    </Button>
  );
}
