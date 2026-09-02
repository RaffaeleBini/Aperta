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

export function IneConnectorForm() {
  const router = useRouter();
  const t = useTranslations("connectors");
  const tIne = useTranslations("connectors.ine");
  const [code, setCode] = useState("");
  const [nult, setNult] = useState("");
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buildParams() {
    const nultNum = Number.parseInt(nult, 10);
    return { code, nult: Number.isFinite(nultNum) && nultNum > 0 ? nultNum : undefined };
  }

  async function handlePreview() {
    setLoading("preview");
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/connectors/ine/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildParams()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Error durante la vista previa.");
      setPreview(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(null);
    }
  }

  async function handleImport() {
    setLoading("import");
    setError(null);
    try {
      const res = await fetch("/api/connectors/ine/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildParams(), name: name || preview?.datasetLabel || code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Error durante la importación.");
      router.push(`/datasets/${json.dataset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ine-code">{tIne("codeLabel")}</Label>
        <Input
          id="ine-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ej. IPC251856 o 50902"
          required
        />
        <p className="text-xs text-muted-foreground">{tIne("codeHint")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ine-nult">{tIne("nultLabel")}</Label>
        <Input
          id="ine-nult"
          type="number"
          min={1}
          value={nult}
          onChange={(e) => setNult(e.target.value)}
          placeholder="12"
          className="max-w-32"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ine-name">{tIne("nameLabel")}</Label>
        <Input
          id="ine-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={preview?.datasetLabel ?? tIne("nameLabel")}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handlePreview} disabled={!code || loading !== null}>
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
