/** Serializa un valor JS a un literal Python equivalente (para embeber `params` de una query como dict). */
export function pyLiteral(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "None";
  if (Array.isArray(value)) return `[${value.map(pyLiteral).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${pyStringLiteral(k)}: ${pyLiteral(v)}`
    );
    return `{${entries.join(", ")}}`;
  }
  return pyStringLiteral(String(value));
}

/** Literal de cadena Python de comillas simples, con escapado seguro de backslash/comillas/saltos de línea. */
export function pyStringLiteral(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `'${escaped}'`;
}

/** Dict Python literal a partir de un mapa de parámetros con nombre (usado por con.execute(sql, params)). */
export function pyParamsDict(params: Record<string, unknown>): string {
  const entries = Object.entries(params).map(([k, v]) => `${pyStringLiteral(k)}: ${pyLiteral(v)}`);
  return `{${entries.join(", ")}}`;
}

/**
 * Embebe SQL literal en un bloque `"""..."""` de Python. El SQL generado por
 * la app casi siempre empieza/termina con un identificador entre comillas
 * dobles (p.ej. `"r0"`) — pegado directamente al delimitador de cierre
 * produciría `""""` (cuatro comillas), que Python interpreta como fin de
 * cadena seguido de una comilla suelta. Los saltos de línea de guarda evitan
 * ese choque sin necesidad de escapar el contenido.
 */
export function pySqlTripleQuote(sql: string): string {
  return `"""\n${sql}\n"""`;
}
