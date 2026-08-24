"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FileUploadForm() {
  const router = useRouter();
  const t = useTranslations("connectors");
  const tFile = useTranslations("connectors.file");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("name", name || file.name);

    try {
      const res = await fetch("/api/connectors/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Errore durante l'import.");
      router.push(`/datasets/${json.dataset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload-file">{tFile("fileLabel")}</Label>
        <Input
          id="upload-file"
          type="file"
          accept=".csv,.json,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload-name">{tFile("nameLabel")}</Label>
        <Input
          id="upload-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={file?.name ?? tFile("nameLabel")}
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={!file || loading}>
        {loading ? t("importing") : t("import")}
      </Button>
    </form>
  );
}
