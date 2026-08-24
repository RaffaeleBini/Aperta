import { useTranslations } from "next-intl";
import type { ColumnProfile } from "@/lib/profiling/queries";
import { QualityAlerts } from "./quality-alerts";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function ColumnSummaryCard({ column }: { column: ColumnProfile }) {
  const t = useTranslations("datasets.profile");

  return (
    <div className="rounded-md border p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-sm">{column.name}</p>
          <p className="text-xs text-muted-foreground">{column.type}</p>
        </div>
        <QualityAlerts alerts={column.alerts} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">{t("nulls")}</dt>
        <dd>{column.nullCount.toLocaleString()}</dd>

        {column.emptyCount !== null && (
          <>
            <dt className="text-muted-foreground">{t("empty")}</dt>
            <dd>{column.emptyCount.toLocaleString()}</dd>
          </>
        )}

        <dt className="text-muted-foreground">{t("distinct")}</dt>
        <dd>{column.distinctCount.toLocaleString()}</dd>

        <dt className="text-muted-foreground">{t("minMax")}</dt>
        <dd>
          {formatValue(column.min)} / {formatValue(column.max)}
        </dd>

        {column.avg !== null && (
          <>
            <dt className="text-muted-foreground">{t("avg")}</dt>
            <dd>{column.avg.toFixed(2)}</dd>
          </>
        )}

        {column.median !== null && (
          <>
            <dt className="text-muted-foreground">{t("median")}</dt>
            <dd>{column.median.toFixed(2)}</dd>
          </>
        )}
      </dl>

      {column.topCategories && column.topCategories.length > 0 && (
        <div className="text-xs">
          <p className="text-muted-foreground mb-1">{t("topCategories")}</p>
          <ul className="flex flex-col gap-0.5">
            {column.topCategories.map((cat) => (
              <li key={cat.value} className="flex justify-between gap-2">
                <span className="truncate">{cat.value}</span>
                <span className="text-muted-foreground">{cat.freq.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
