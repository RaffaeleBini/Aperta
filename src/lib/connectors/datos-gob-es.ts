import { pickLabel, isIngestableFormat, type CatalogDataset, type CatalogResource } from "./catalog-search";

const BASE = "https://datos.gob.es/apidata/catalog/dataset";
const FETCH_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 20;

interface DgeDistribution {
  title?: unknown;
  downloadURL?: string;
  accessURL?: string;
  format?: unknown;
}

interface DgeItem {
  _about: string;
  title?: unknown;
  description?: unknown;
  distribution?: DgeDistribution | DgeDistribution[];
}

async function fetchJson(url: string): Promise<{ result?: { items?: DgeItem[] } }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`datos.gob.es ha respondido ${res.status}.`);
  }

  return res.json();
}

function toResources(distribution: DgeItem["distribution"]): CatalogResource[] {
  const list = Array.isArray(distribution) ? distribution : distribution ? [distribution] : [];
  return list
    .map((d) => ({
      title: pickLabel(d.title) || "recurso",
      url: d.downloadURL ?? d.accessURL ?? "",
      format: pickLabel(d.format) || undefined,
    }))
    .filter((r) => r.url && isIngestableFormat(r.format, r.url));
}

export async function searchDatasets(keyword: string): Promise<CatalogDataset[]> {
  const url = `${BASE}/keyword/${encodeURIComponent(keyword)}.json?_pageSize=${PAGE_SIZE}`;
  const payload = await fetchJson(url);
  const items = payload.result?.items ?? [];

  return items.map((item) => ({
    id: item._about,
    title: pickLabel(item.title) || item._about,
    description: pickLabel(item.description) || undefined,
    resources: toResources(item.distribution),
  }));
}
