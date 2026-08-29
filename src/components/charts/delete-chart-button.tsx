"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteChartButton({ datasetId, chartId }: { datasetId: string; chartId: string }) {
  const t = useTranslations("charts.builder");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(t("deleteConfirm"))) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/datasets/${datasetId}/charts/${chartId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error(t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" className="size-8" onClick={handleDelete} disabled={loading}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}
