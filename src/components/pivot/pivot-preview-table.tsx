"use client";

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

export function PivotPreviewTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  const t = useTranslations("pivot");

  if (columns.length === 0) {
    return <p className="text-sm text-muted-foreground p-2">{t("emptyResult")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground px-1">{t("previewSummary", { shown: rows.length })}</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c}>{formatCell(row[c])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
