/**
 * Tipos y helpers compartidos por los conectores de catálogo CKAN/DCAT
 * (datos.gob.es, data.europa.eu): a diferencia de Eurostat/INE, aquí no hay
 * "un dataset = una URL de datos" — hay que buscar por palabra clave y elegir
 * un recurso descargable dentro del dataset elegido, que luego se importa
 * mediante el conector genérico ya existente.
 */

export interface CatalogResource {
  title: string;
  url: string;
  format?: string;
}

export interface CatalogDataset {
  id: string;
  title: string;
  description?: string;
  resources: CatalogResource[];
}

/**
 * Los catálogos DCAT devuelven título/descripción como texto plano, como
 * objeto `{_value, _lang}` (datos.gob.es) o como mapa de idioma->texto
 * (data.europa.eu). Este helper acepta cualquiera de esas formas.
 */
export function pickLabel(field: unknown, preferredLang = "es"): string {
  if (field == null) return "";
  if (typeof field === "string") return field;

  if (Array.isArray(field)) {
    const preferred = field.find(
      (f) => f && typeof f === "object" && ((f as Record<string, unknown>)._lang === preferredLang)
    );
    return pickLabel(preferred ?? field[0], preferredLang);
  }

  if (typeof field === "object") {
    const obj = field as Record<string, unknown>;
    if (typeof obj._value === "string") return obj._value;
    if (typeof obj.value === "string") return obj.value;
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj[preferredLang] === "string") return obj[preferredLang] as string;
    const firstString = Object.values(obj).find((v) => typeof v === "string");
    return (firstString as string) ?? "";
  }

  return String(field);
}

const INGESTABLE_FORMATS = ["csv", "json"];

/** ingestFileIntoTable solo soporta CSV/JSON (vía read_csv_auto/read_json_auto) — se descartan otros formatos (XML, RDF, PDF, XLSX...). */
export function isIngestableFormat(format: string | undefined, url: string): boolean {
  const declared = (format ?? "").toLowerCase();
  if (INGESTABLE_FORMATS.some((f) => declared.includes(f))) return true;

  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ext === "csv" || ext === "json";
}
