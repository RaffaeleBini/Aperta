import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listDatasets } from "@/lib/duckdb/datasets";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileUploadForm } from "@/components/connectors/file-upload-form";
import { GenericConnectorForm } from "@/components/connectors/generic-connector-form";
import { EurostatConnectorForm } from "@/components/connectors/eurostat-connector-form";
import { IneConnectorForm } from "@/components/connectors/ine-connector-form";
import { CatalogSearchConnectorForm } from "@/components/connectors/catalog-search-connector-form";
import { DeleteDatasetButton } from "@/components/datasets/delete-dataset-button";

export default async function DatasetsPage() {
  const datasets = await listDatasets();
  const t = await getTranslations("datasets");

  return (
    <div className="flex flex-col gap-8 p-6">
      <section>
        <h1 className="font-heading text-2xl mb-4">{t("importTitle")}</h1>
        <Tabs defaultValue="file">
          <TabsList>
            <TabsTrigger value="file">{t("tabs.file")}</TabsTrigger>
            <TabsTrigger value="generic">{t("tabs.generic")}</TabsTrigger>
            <TabsTrigger value="eurostat">{t("tabs.eurostat")}</TabsTrigger>
            <TabsTrigger value="ine">{t("tabs.ine")}</TabsTrigger>
            <TabsTrigger value="datosGobEs">{t("tabs.datosGobEs")}</TabsTrigger>
            <TabsTrigger value="dataEuropaEu">{t("tabs.dataEuropaEu")}</TabsTrigger>
          </TabsList>
          <TabsContent value="file">
            <FileUploadForm />
          </TabsContent>
          <TabsContent value="generic">
            <GenericConnectorForm />
          </TabsContent>
          <TabsContent value="eurostat">
            <EurostatConnectorForm />
          </TabsContent>
          <TabsContent value="ine">
            <IneConnectorForm />
          </TabsContent>
          <TabsContent value="datosGobEs">
            <CatalogSearchConnectorForm portal="datos-gob-es" />
          </TabsContent>
          <TabsContent value="dataEuropaEu">
            <CatalogSearchConnectorForm portal="data-europa-eu" />
          </TabsContent>
        </Tabs>
      </section>

      <section>
        <h2 className="font-heading text-xl mb-4">{t("yourDatasets")}</h2>
        {datasets.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noDatasets")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/10"
              >
                <Link href={`/datasets/${dataset.id}`} className="flex-1">
                  <p className="font-medium">{dataset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("rowsAndColumns", {
                      rows: dataset.row_count.toLocaleString(),
                      columns: dataset.column_count,
                    })}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{dataset.source_type}</Badge>
                  <DeleteDatasetButton datasetId={dataset.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
