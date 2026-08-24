import { NextResponse } from "next/server";
import { getDataset, getDatasetRows } from "@/lib/duckdb/datasets";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);

  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const result = await getDatasetRows(dataset, {
    page: Number(searchParams.get("page")) || undefined,
    pageSize: Number(searchParams.get("pageSize")) || undefined,
    sort: searchParams.get("sort") ?? undefined,
    dir: searchParams.get("dir") ?? undefined,
  });

  return NextResponse.json(result);
}
