import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listChartsByDataset } from "@/lib/charts/charts";
import { CHART_TYPE_ICONS } from "@/lib/charts/chart-type-icons";
import { DeleteChartButton } from "./delete-chart-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export async function ChartList({ datasetId }: { datasetId: string }) {
  const t = await getTranslations("charts");
  const charts = await listChartsByDataset(datasetId);

  return (
    <div className="flex flex-col gap-4">
      <Button asChild className="w-fit">
        <Link href={`/datasets/${datasetId}/charts/new`}>
          <Plus className="size-4" />
          {t("newChart")}
        </Link>
      </Button>

      {charts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noCharts")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {charts.map((chart) => {
            const Icon = CHART_TYPE_ICONS[chart.chart_type];
            return (
              <Link
                key={chart.id}
                href={`/datasets/${datasetId}/charts/${chart.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="font-medium">{chart.name}</span>
                </div>
                <DeleteChartButton datasetId={datasetId} chartId={chart.id} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
