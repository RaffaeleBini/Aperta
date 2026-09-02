import { pickLabel, isIngestableFormat, type CatalogDataset, type CatalogResource } from "./catalog-search";

const BASE = "https://data.europa.eu/api/hub/search/search";
const FETCH_TIMEOUT_MS = 30_000;
const LIMIT = 20;

interface DeeDistribution {
  title?: unknown;
  download_url?: string | string[];
  access_url?: string | string[];
  format?: unknown;
}

interface DeeResult {
  id: string;
  title?: unknown;
  description?: unknown;
  distributions?: DeeDistribution[];
}

async function fetchJson(url: string): Promise<{ result?: { results?: DeeResult[] } }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`data.europa.eu ha respondido ${res.status}.`);
  }

  return res.json();
}

function firstUrl(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toResources(distributions: DeeDistribution[] | undefined): CatalogResource[] {
  return (distributions ?? [])
    .map((d) => ({
      title: pickLabel(d.title) || "recurso",
      url: firstUrl(d.download_url) || firstUrl(d.access_url),
      format: pickLabel(d.format) || undefined,
    }))
    .filter((r) => r.url && isIngestableFormat(r.format, r.url));
}

export async function searchDatasets(keyword: string): Promise<CatalogDataset[]> {
  const url = `${BASE}?q=${encodeURIComponent(keyword)}&limit=${LIMIT}`;
  const payload = await fetchJson(url);
  const results = payload.result?.results ?? [];

  return results.map((item) => ({
    id: item.id,
    title: pickLabel(item.title) || item.id,
    description: pickLabel(item.description) || undefined,
    resources: toResources(item.distributions),
  }));
}
