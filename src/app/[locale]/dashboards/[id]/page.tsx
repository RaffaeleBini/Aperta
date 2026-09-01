import { notFound } from "next/navigation";
import { getDashboard, listItems } from "@/lib/dashboards/dashboards";
import { DashboardBuilderClient } from "@/components/dashboard/dashboard-builder-loader";

export default async function DashboardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) notFound();

  const items = await listItems(id);
  return <DashboardBuilderClient dashboard={dashboard} initialItems={items} />;
}
