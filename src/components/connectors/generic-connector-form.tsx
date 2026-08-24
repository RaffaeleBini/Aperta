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
  columns: { name: string; type: string }[];
  preview: Record<string, unknown>[];
  totalRows: number;
}

export function GenericConnectorForm() {
  const router = useRouter();
  const t = useTranslations("connectors");
  const tGeneric = useTranslations("connectors.generic");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setLoading("preview");
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/connectors/generic/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
      const res = await fetch("/api/connectors/generic/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name: name || url }),
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
        <Label htmlFor="generic-url">{tGeneric("urlLabel")}</Label>
        <Input
          id="generic-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="generic-name">{tGeneric("nameLabel")}</Label>
        <Input
          id="generic-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tGeneric("nameLabel")}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handlePreview} disabled={!url || loading !== null}>
          {loading === "preview" ? t("previewing") : t("preview")}
        </Button>
        <Button type="button" onClick={handleImport} disabled={!preview || loading !== null}>
          {loading === "import" ? t("importing") : t("import")}
        </Button>
      </div>

      {preview && (
        <PreviewTable
          columns={preview.columns.map((c) => c.name)}
          rows={preview.preview}
          totalRows={preview.totalRows}
        />
      )}
    </div>
  );
}
