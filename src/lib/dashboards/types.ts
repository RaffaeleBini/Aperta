export type DashboardItemType = "chart" | "pivot";
export type DashboardItemSize = "small" | "medium" | "large";

export interface DashboardRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardItemRecord {
  id: string;
  dashboard_id: string;
  item_type: DashboardItemType;
  item_id: string;
  size: DashboardItemSize;
  position: number;
  created_at: string;
}
