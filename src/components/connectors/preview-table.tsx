import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function PreviewTable({
  columns,
  rows,
  totalRows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}) {
  const t = useTranslations("connectors");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {t("previewSummary", { shown: rows.length, total: totalRows.toLocaleString() })}
      </p>
      <div className="overflow-x-auto rounded-md border max-h-80">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col}>{formatCell(row[col])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
