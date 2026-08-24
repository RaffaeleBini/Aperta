import { NextResponse } from "next/server";
import { getDataset } from "@/lib/duckdb/datasets";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dataset = await getDataset(id);

  if (!dataset) {
    return NextResponse.json({ error: "Dataset non trovato." }, { status: 404 });
  }

  return NextResponse.json({ dataset });
}
