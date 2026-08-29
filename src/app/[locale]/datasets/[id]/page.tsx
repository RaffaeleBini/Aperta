import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDataset } from "@/lib/duckdb/datasets";
import { profileDataset } from "@/lib/profiling/queries";
import { ColumnSummaryCard } from "@/components/data-profile/column-summary-card";
import { DatasetTable } from "@/components/data-profile/dataset-table";
import { ChartList } from "@/components/charts/chart-list";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function DatasetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset(id);

  if (!dataset) {
    notFound();
  }

  const profile = await profileDataset(dataset.table_name, dataset.schema_json, dataset.row_count);
  const columnNames = dataset.schema_json.map((c) => c.name);
  const t = await getTranslations("datasets");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-2xl">{dataset.name}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Badge variant="secondary">{dataset.source_type}</Badge>
          <span>
            {t("rowsAndColumns", {
              rows: dataset.row_count.toLocaleString(),
              columns: dataset.column_count,
            })}
          </span>
          {profile.duplicateRowCount > 0 && (
            <>
              <span>·</span>
              <span>
                {t("detail.duplicates", { count: profile.duplicateRowCount.toLocaleString() })}
              </span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t("detail.quality")}</TabsTrigger>
          <TabsTrigger value="table">{t("detail.table")}</TabsTrigger>
          <TabsTrigger value="charts">{t("detail.charts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.columns.map((column) => (
              <ColumnSummaryCard key={column.name} column={column} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <DatasetTable datasetId={dataset.id} columns={columnNames} />
        </TabsContent>

        <TabsContent value="charts">
          <ChartList datasetId={dataset.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
