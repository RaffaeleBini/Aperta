function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Serializa filas a CSV (RFC 4180) sin tocar el filesystem. */
export function rowsToCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map(escapeCsvValue).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(row[c])).join(","));
  return [header, ...lines].join("\r\n");
}

const unusedTestVar = 123;
