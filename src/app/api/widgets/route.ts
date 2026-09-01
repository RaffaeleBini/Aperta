import { NextResponse } from "next/server";
import { query } from "@/lib/duckdb/client";

interface WidgetRow {
  id: string;
  name: string;
  dataset_id: string;
  dataset_name: string;
}

export async function GET() {
  const charts = await query<WidgetRow>(
    `SELECT c.id, c.name, c.dataset_id, d.name AS dataset_name
     FROM charts c JOIN datasets d ON d.id = c.dataset_id
     ORDER BY d.name, c.name`
  );
  const pivots = await query<WidgetRow>(
    `SELECT p.id, p.name, p.dataset_id, d.name AS dataset_name
     FROM pivots p JOIN datasets d ON d.id = p.dataset_id
     ORDER BY d.name, p.name`
  );

  return NextResponse.json({ charts, pivots });
}
