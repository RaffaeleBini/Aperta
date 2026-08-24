"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PreviewTable } from "./preview-table";

interface Preview {
  columns: string[];
  preview: Record<string, unknown>[];
  totalRows: number;
  datasetLabel?: string;
}

export function EurostatConnectorForm() {
  const router = useRouter();
  const t = useTranslations("connectors");
  const tEurostat = useTranslations("connectors.eurostat");
  const [datasetCode, setDatasetCode] = useState("");
  const [geo, setGeo] = useState("");
  const [sinceTimePeriod, setSinceTimePeriod] = useState("");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buildFilters(): Record<string, string | string[]> {
    const filters: Record<string, string | string[]> = {};
    if (geo.trim()) {
      filters.geo = geo.split(",").map((v) => v.trim()).filter(Boolean);
    }
    if (sinceTimePeriod.trim()) {
      filters.sinceTimePeriod = sinceTimePeriod.trim();
    }
    return filters;
  }

  async function handlePreview() {
    setLoading("preview");
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/connectors/eurostat/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetCode, filters: buildFilters() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Errore durante l'anteprima.");
      setPreview(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setLoading(null);
    }
  }

  async function handleImport() {
    setLoading("import");
    setError(null);
    try {
      const res = await fetch("/api/connectors/eurostat/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetCode,
          filters: buildFilters(),
          name: name || preview?.datasetLabel || datasetCode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Errore durante l'import.");
      router.push(`/datasets/${json.dataset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eurostat-code">{tEurostat("codeLabel")}</Label>
        <Input
          id="eurostat-code"
          value={datasetCode}
          onChange={(e) => setDatasetCode(e.target.value)}
          placeholder="es. DEMO_R_D3DENS"
          required
        />
        <p className="text-xs text-muted-foreground">{tEurostat("codeHint")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="eurostat-geo">{tEurostat("geoLabel")}</Label>
          <Input
            id="eurostat-geo"
            value={geo}
            onChange={(e) => setGeo(e.target.value)}
            placeholder="ES,IT"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="eurostat-time">{tEurostat("timeLabel")}</Label>
          <Input
            id="eurostat-time"
            value={sinceTimePeriod}
            onChange={(e) => setSinceTimePeriod(e.target.value)}
            placeholder="2015"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eurostat-name">{tEurostat("nameLabel")}</Label>
        <Input
          id="eurostat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={preview?.datasetLabel ?? tEurostat("nameLabel")}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={!datasetCode || loading !== null}
        >
          {loading === "preview" ? t("previewing") : t("preview")}
        </Button>
        <Button type="button" onClick={handleImport} disabled={!preview || loading !== null}>
          {loading === "import" ? t("importing") : t("import")}
        </Button>
      </div>

      {preview && (
        <PreviewTable columns={preview.columns} rows={preview.preview} totalRows={preview.totalRows} />
      )}
    </div>
  );
}
