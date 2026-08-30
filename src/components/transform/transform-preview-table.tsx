import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransformColumn } from "@/lib/transformations/types";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function TransformPreviewTable({
  columns,
  rows,
  totalRows,
}: {
  columns: TransformColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
}) {
  const t = useTranslations("transform");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground px-1">
        {t("previewSummary", { shown: rows.length, total: totalRows.toLocaleString() })}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.name}>{c.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.name}>{formatCell(row[c.name])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
