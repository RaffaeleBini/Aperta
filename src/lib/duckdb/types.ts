const NUMERIC_TYPES = new Set([
  "TINYINT",
  "SMALLINT",
  "INTEGER",
  "BIGINT",
  "HUGEINT",
  "UTINYINT",
  "USMALLINT",
  "UINTEGER",
  "UBIGINT",
  "FLOAT",
  "DOUBLE",
  "DECIMAL",
]);

const TEMPORAL_TYPES = new Set(["DATE", "TIMESTAMP", "TIMESTAMP WITH TIME ZONE", "TIME"]);

function baseType(type: string): string {
  return type.split("(")[0].toUpperCase();
}

export function isNumericType(type: string): boolean {
  return NUMERIC_TYPES.has(baseType(type));
}

export function isVarcharType(type: string): boolean {
  return type.toUpperCase().startsWith("VARCHAR");
}

export function isTemporalType(type: string): boolean {
  return TEMPORAL_TYPES.has(baseType(type));
}
