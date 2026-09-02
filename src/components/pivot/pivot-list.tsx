import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPivotsByDataset } from "@/lib/pivot/pivots";
import { DeletePivotButton } from "./delete-pivot-button";
import { ExportPivotLink } from "./export-pivot-link";
import { ExportPivotNotebookLink } from "./export-pivot-notebook-link";
import { Button } from "@/components/ui/button";
import { Plus, Table2 } from "lucide-react";

export async function PivotList({ datasetId }: { datasetId: string }) {
  const t = await getTranslations("pivot");
  const pivots = await listPivotsByDataset(datasetId);

  return (
    <div className="flex flex-col gap-4">
      <Button asChild className="w-fit">
        <Link href={`/datasets/${datasetId}/pivots/new`}>
          <Plus className="size-4" />
          {t("newPivot")}
        </Link>
      </Button>

      {pivots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noPivots")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {pivots.map((pivot) => (
            <div
              key={pivot.id}
              className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/10"
            >
              <Link
                href={`/datasets/${datasetId}/pivots/${pivot.id}`}
                className="flex items-center gap-2 flex-1"
              >
                <Table2 className="size-4 text-muted-foreground" />
                <span className="font-medium">{pivot.name}</span>
              </Link>
              <div className="flex items-center gap-1">
                <ExportPivotLink datasetId={datasetId} pivotId={pivot.id} />
                <ExportPivotNotebookLink datasetId={datasetId} pivotId={pivot.id} />
                <DeletePivotButton datasetId={datasetId} pivotId={pivot.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
