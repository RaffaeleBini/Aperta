import { useTranslations } from "next-intl";

export function ChartEmptyState() {
  const t = useTranslations("charts.builder");
  return (
    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
      {t("emptyState")}
    </div>
  );
}
