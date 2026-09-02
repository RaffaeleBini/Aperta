/**
 * Parser para la API Tempus3 del INE. A diferencia del formato JSON-stat de
 * Eurostat (producto cartesiano de dimensiones), aquí solo hay que aplanar un
 * anidado simple: cada serie trae su propio array `Data` de periodos.
 */

interface IneDataPoint {
  Fecha: number;
  FK_Periodo?: number;
  Anyo: number;
  Valor: number | null;
  Secreto?: boolean;
}

interface IneSeries {
  COD: string;
  Nombre: string;
  Data?: IneDataPoint[];
}

export interface IneRow {
  codigo: string;
  nombre: string;
  fecha: string;
  anyo: number;
  periodo: number | null;
  valor: number | null;
  secreto: boolean;
}

export function parseIneResponseToRows(payload: unknown): IneRow[] {
  const series: IneSeries[] = Array.isArray(payload)
    ? (payload as IneSeries[])
    : [payload as IneSeries];

  const rows: IneRow[] = [];
  for (const s of series) {
    if (!s || !Array.isArray(s.Data)) continue;
    for (const d of s.Data) {
      rows.push({
        codigo: s.COD,
        nombre: s.Nombre,
        fecha: new Date(d.Fecha).toISOString(),
        anyo: d.Anyo,
        periodo: d.FK_Periodo ?? null,
        valor: d.Valor ?? null,
        secreto: Boolean(d.Secreto),
      });
    }
  }
  return rows;
}
