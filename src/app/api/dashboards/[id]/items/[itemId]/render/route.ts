import { NextResponse } from "next/server";
import { getItem } from "@/lib/dashboards/dashboards";
import { getChart } from "@/lib/charts/charts";
import { buildChartQuery } from "@/lib/charts/query-builder";
import { getPivot } from "@/lib/pivot/pivots";
import { runPivotQuery, PivotTooLargeError } from "@/lib/pivot/run-pivot";
import { effectiveTableName, getDataset } from "@/lib/duckdb/datasets";
import { query } from "@/lib/duckdb/client";

const WIDGET_ROW_LIMIT = 200;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const item = await getItem(id, itemId);
  if (!item) {
    return NextResponse.json({ error: "Widget no encontrado." }, { status: 404 });
  }

  try {
    if (item.item_type === "chart") {
      const chart = await getChart(item.item_id);
      if (!chart) return NextResponse.json({ error: "El gráfico ya no existe." }, { status: 404 });
      const dataset = await getDataset(chart.dataset_id);
      if (!dataset) return NextResponse.json({ error: "El dataset del gráfico ya no existe." }, { status: 404 });

      const built = buildChartQuery(effectiveTableName(dataset), chart.config_json);
      const rows = await query(built.sql, built.params);
      return NextResponse.json({ itemType: "chart", chart, rows, columnMap: built.columnMap });
    }

    const pivot = await getPivot(item.item_id);
    if (!pivot) return NextResponse.json({ error: "La tabla dinámica ya no existe." }, { status: 404 });
    const dataset = await getDataset(pivot.dataset_id);
    if (!dataset) return NextResponse.json({ error: "El dataset de la tabla dinámica ya no existe." }, { status: 404 });

    const result = await runPivotQuery(effectiveTableName(dataset), pivot.config_json, {
      limit: WIDGET_ROW_LIMIT,
    });
    return NextResponse.json({ itemType: "pivot", pivot, columns: result.columns, rows: result.rows });
  } catch (err) {
    if (err instanceof PivotTooLargeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
