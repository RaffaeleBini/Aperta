import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function QualityAlerts({ alerts }: { alerts: string[] }) {
  const t = useTranslations("datasets.profile.alerts");

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((alert) => (
        <Badge key={alert} variant="destructive" className="text-xs">
          {t.has(alert) ? t(alert) : alert}
        </Badge>
      ))}
    </div>
  );
}
