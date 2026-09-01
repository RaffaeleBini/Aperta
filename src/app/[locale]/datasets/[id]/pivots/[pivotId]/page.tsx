import { notFound } from "next/navigation";
import { getDataset } from "@/lib/duckdb/datasets";
import { getPivot } from "@/lib/pivot/pivots";
import { PivotBuilderClient } from "@/components/pivot/pivot-builder-loader";

export default async function EditPivotPage({
  params,
}: {
  params: Promise<{ id: string; pivotId: string }>;
}) {
  const { id, pivotId } = await params;
  const dataset = await getDataset(id);
  if (!dataset) notFound();

  const pivot = await getPivot(pivotId);
  if (!pivot || pivot.dataset_id !== id) notFound();

  return <PivotBuilderClient datasetId={id} columns={dataset.schema_json} initialPivot={pivot} />;
}
