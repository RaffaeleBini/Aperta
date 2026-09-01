"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportPivotLink({ datasetId, pivotId }: { datasetId: string; pivotId: string }) {
  const t = useTranslations("pivot");

  return (
    <Button variant="ghost" size="icon" className="size-8" asChild>
      <a
        href={`/api/datasets/${datasetId}/pivots/${pivotId}/export`}
        onClick={(e) => e.stopPropagation()}
        aria-label={t("exportCsv")}
      >
        <Download className="size-3.5" />
      </a>
    </Button>
  );
}
