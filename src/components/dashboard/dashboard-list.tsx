import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listDashboards } from "@/lib/dashboards/dashboards";
import { NewDashboardDialog } from "./new-dashboard-dialog";
import { DeleteDashboardButton } from "./delete-dashboard-button";
import { LayoutDashboard } from "lucide-react";

export async function DashboardList() {
  const t = await getTranslations("dashboard");
  const dashboards = await listDashboards();

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl">{t("title")}</h1>
        <NewDashboardDialog />
      </div>

      {dashboards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDashboards")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dashboards.map((dashboard) => (
            <Link
              key={dashboard.id}
              href={`/dashboards/${dashboard.id}`}
              className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/10"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="size-4 text-muted-foreground" />
                <span className="font-medium">{dashboard.name}</span>
              </div>
              <DeleteDashboardButton dashboardId={dashboard.id} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
