import type { BuiltChartQuery } from "../charts/query-builder";
import type { ChartConfig, ChartType } from "../charts/types";
import { pyStringLiteral } from "./py-literal";

type ColumnMap = BuiltChartQuery["columnMap"];

function measureAliases(columnMap: ColumnMap): string[] {
  return Object.entries(columnMap)
    .filter(([, c]) => c.shelf === "y" && c.role === "measure")
    .map(([alias]) => alias);
}

/**
 * Función Python auxiliar embebida en el notebook: replica `pivotForCategorySeries`
 * (src/lib/charts/client-transforms.ts) — sin "color" cada medida ya es una serie,
 * con "color" se pivota a una columna por valor distinto de "color".
 */
const PIVOT_FOR_SERIES_HELPER = `def _pivot_for_series(df, measure_cols, has_color):
    if not has_color:
        return df.set_index("x")[measure_cols]
    frames = []
    for col in measure_cols:
        wide = df.pivot(index="x", columns="color", values=col)
        if len(measure_cols) > 1:
            wide.columns = [f"{c} — {col}" for c in wide.columns]
        frames.append(wide)
    return pd.concat(frames, axis=1)
`;

function seriesChartCode(chartType: "bar" | "line" | "area", columnMap: ColumnMap, options: ChartConfig["options"]): string {
  const measures = measureAliases(columnMap);
  const hasColor = "color" in columnMap;
  const stacked = chartType === "area" ? options?.stacked !== false : !!options?.stacked;
  const kindByType: Record<typeof chartType, string> = { bar: "bar", line: "line", area: "area" };

  return `${PIVOT_FOR_SERIES_HELPER}
measure_cols = [${measures.map(pyStringLiteral).join(", ")}]
wide = _pivot_for_series(df_chart, measure_cols, has_color=${hasColor ? "True" : "False"})

fig, ax = plt.subplots(figsize=(10, 6))
wide.plot(kind=${pyStringLiteral(kindByType[chartType])}, stacked=${stacked ? "True" : "False"}, ax=ax)
ax.set_xlabel("x")
plt.xticks(rotation=45, ha="right")
plt.legend(title=None)
plt.tight_layout()
plt.show()
`;
}

function scatterChartCode(columnMap: ColumnMap): string {
  const hasColor = "color" in columnMap;
  const hasSize = "size" in columnMap;
  return `fig, ax = plt.subplots(figsize=(8, 6))
groups = df_chart.groupby("color") if ${hasColor ? "True" : "False"} else [("", df_chart)]
for name, group in groups:
    ax.scatter(
        group["x"],
        group["y"],
        s=(group["size"] * 20 if ${hasSize ? "True" : "False"} else 60),
        label=str(name) if name else None,
        alpha=0.75,
    )
ax.set_xlabel("x")
ax.set_ylabel("y")
if ${hasColor ? "True" : "False"}:
    plt.legend()
plt.tight_layout()
plt.show()
`;
}

function pieChartCode(options: ChartConfig["options"]): string {
  const donut = !!options?.donut;
  return `fig, ax = plt.subplots(figsize=(7, 7))
ax.pie(
    df_chart["y"],
    labels=df_chart["color"],
    autopct="%1.1f%%",
    wedgeprops=(dict(width=0.4) if ${donut ? "True" : "False"} else None),
)
ax.axis("equal")
plt.tight_layout()
plt.show()
`;
}

function heatmapChartCode(): string {
  return `import seaborn as sns

matrix = df_chart.pivot(index="y", columns="x", values="color")
fig, ax = plt.subplots(figsize=(10, 6))
sns.heatmap(matrix, cmap="viridis", ax=ax)
plt.tight_layout()
plt.show()
`;
}

export function buildChartPlotCode(
  chartType: ChartType,
  columnMap: ColumnMap,
  options: ChartConfig["options"]
): string {
  switch (chartType) {
    case "bar":
    case "line":
    case "area":
      return seriesChartCode(chartType, columnMap, options);
    case "scatter":
      return scatterChartCode(columnMap);
    case "pie":
      return pieChartCode(options);
    case "heatmap":
      return heatmapChartCode();
  }
}
