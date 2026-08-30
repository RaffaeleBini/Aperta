import { notFound } from "next/navigation";
import { getDataset, listDatasets } from "@/lib/duckdb/datasets";
import { listSteps } from "@/lib/transformations/transformations";
import { TransformBuilderClient } from "@/components/transform/transform-builder-loader";

export default async function TransformPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dataset = await getDataset(id);
  if (!dataset) notFound();

  const [steps, allDatasets] = await Promise.all([listSteps(id), listDatasets()]);
  const otherDatasets = allDatasets
    .filter((d) => d.id !== id)
    .map((d) => ({ id: d.id, name: d.name }));

  return (
    <TransformBuilderClient
      datasetId={id}
      initialColumns={dataset.schema_json}
      initialSteps={steps}
      otherDatasets={otherDatasets}
    />
  );
}
