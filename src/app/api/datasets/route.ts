import { NextResponse } from "next/server";
import { listDatasets } from "@/lib/duckdb/datasets";

export async function GET() {
  const datasets = await listDatasets();
  return NextResponse.json({ datasets });
}
