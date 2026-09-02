"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { GenericConnectorForm } from "./generic-connector-form";

interface CatalogResource {
  title: string;
  url: string;
  format?: string;
}

interface CatalogDataset {
  id: string;
  title: string;
  description?: string;
  resources: CatalogResource[];
}

export function CatalogSearchConnectorForm({ portal }: { portal: "datos-gob-es" | "data-europa-eu" }) {
  const t = useTranslations("connectors.catalogSearch");
  const [keyword, setKeyword] = useState("");
  const [datasets, setDatasets] = useState<CatalogDataset[] | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<CatalogDataset | null>(null);
  const [selectedResource, setSelectedResource] = useState<CatalogResource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setDatasets(null);
    setSelectedDataset(null);
    setSelectedResource(null);
    try {
      const res = await fetch(`/api/connectors/${portal}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : t("searchError"));
      setDatasets(json.datasets);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("searchError"));
    } finally {
      setLoading(false);
    }
  }

  if (selectedResource) {
    return (
      <div className="flex flex-col gap-3 max-w-2xl">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => setSelectedResource(null)}>
          ← {t("back")}
        </Button>
        <GenericConnectorForm initialUrl={selectedResource.url} initialName={selectedDataset?.title ?? ""} />
      </div>
    );
  }

  if (selectedDataset) {
    return (
      <div className="flex flex-col gap-3 max-w-2xl">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => setSelectedDataset(null)}>
          ← {t("back")}
        </Button>
        <p className="text-sm font-medium">{selectedDataset.title}</p>
        <p className="text-xs text-muted-foreground">{t("chooseResource")}</p>
        {selectedDataset.resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noResources")}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {selectedDataset.resources.map((r, i) => (
              <button
                key={i}
                type="button"
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-left hover:bg-accent/10"
                onClick={() => setSelectedResource(r)}
              >
                <span className="text-sm truncate">{r.title}</span>
                {r.format && <Badge variant="secondary">{r.format}</Badge>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="catalog-keyword">{t("searchLabel")}</Label>
        <div className="flex gap-2">
          <Input
            id="catalog-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("searchPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button type="button" onClick={handleSearch} disabled={!keyword.trim() || loading}>
            {loading ? t("searching") : t("searchButton")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {datasets &&
        (datasets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">{t("chooseDataset")}</p>
            {datasets.map((d) => (
              <button
                key={d.id}
                type="button"
                className="flex flex-col gap-0.5 rounded-md border p-3 text-left hover:bg-accent/10"
                onClick={() => setSelectedDataset(d)}
              >
                <span className="text-sm font-medium truncate">{d.title}</span>
                {d.description && (
                  <span className="text-xs text-muted-foreground line-clamp-2">{d.description}</span>
                )}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
