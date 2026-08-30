import { NextResponse } from "next/server";
import { effectiveTableName, getDataset } from "@/lib/duckdb/datasets";
import { profileDataset } from "@/lib/profiling/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);

  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const profile = await profileDataset(
    effectiveTableName(dataset),
    dataset.schema_json,
    dataset.row_count
  );

  return NextResponse.json({ profile });
}
