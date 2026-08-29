import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { heatmapCellColor } from "@/lib/charts/palette";

const MAX_AXIS_CATEGORIES = 50;

export function HeatmapChart({ rows }: { rows: Record<string, unknown>[] }) {
  const t = useTranslations("charts.builder");
  const xValues = Array.from(new Set(rows.map((r) => String(r.x ?? "")))).sort();
  const yValues = Array.from(new Set(rows.map((r) => String(r.y ?? "")))).sort();

  if (xValues.length > MAX_AXIS_CATEGORIES || yValues.length > MAX_AXIS_CATEGORIES) {
    return <p className="text-sm text-muted-foreground p-4">{t("errors.heatmapTooLarge")}</p>;
  }

  const valueMap = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const value = Number(row.color);
    if (Number.isNaN(value)) continue;
    valueMap.set(`${row.x}|${row.y}`, value);
    if (value < min) min = value;
    if (value > max) max = value;
  }

  return (
    <div className="w-full h-full overflow-auto">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `auto repeat(${xValues.length}, minmax(2.5rem, 1fr))` }}
      >
        <div />
        {xValues.map((x) => (
          <div key={x} className="text-xs text-muted-foreground text-center px-1 truncate">
            {x}
          </div>
        ))}
        {yValues.map((y) => (
          <Fragment key={y}>
            <div className="text-xs text-muted-foreground pr-2 flex items-center justify-end truncate">
              {y}
            </div>
            {xValues.map((x) => {
              const value = valueMap.get(`${x}|${y}`);
              return (
                <div
                  key={`${x}-${y}`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor:
                      value !== undefined ? heatmapCellColor(value, min, max) : "var(--muted)",
                  }}
                  title={`${x} / ${y}: ${value ?? "—"}`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
