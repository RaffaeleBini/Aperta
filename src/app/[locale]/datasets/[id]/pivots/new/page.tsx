import { notFound } from "next/navigation";
import { getDataset } from "@/lib/duckdb/datasets";
import { PivotBuilderClient } from "@/components/pivot/pivot-builder-loader";

export default async function NewPivotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) notFound();

  return <PivotBuilderClient datasetId={id} columns={dataset.schema_json} />;
}
