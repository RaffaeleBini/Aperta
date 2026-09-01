import { getConnection, query } from "../duckdb/client";
import type { DashboardItemRecord, DashboardItemSize, DashboardItemType, DashboardRecord } from "./types";

function normalizeItem(row: DashboardItemRecord): DashboardItemRecord {
  return { ...row, position: Number(row.position) };
}

export async function createDashboard(name: string): Promise<DashboardRecord> {
  const [row] = await query<DashboardRecord>(
    `INSERT INTO dashboards (name) VALUES ($name) RETURNING *`,
    { name }
  );
  return row;
}

export async function renameDashboard(id: string, name: string): Promise<DashboardRecord | null> {
  const conn = await getConnection();
  await conn.run(
    `UPDATE dashboards SET name = $name, updated_at = current_timestamp WHERE id = $id`,
    { id, name }
  );
  return getDashboard(id);
}

export async function deleteDashboard(id: string): Promise<void> {
  const conn = await getConnection();
  await conn.run(`DELETE FROM dashboard_items WHERE dashboard_id = $id`, { id });
  await conn.run(`DELETE FROM dashboards WHERE id = $id`, { id });
}

export async function listDashboards(): Promise<DashboardRecord[]> {
  return query<DashboardRecord>(`SELECT * FROM dashboards ORDER BY updated_at DESC`);
}

export async function getDashboard(id: string): Promise<DashboardRecord | null> {
  const rows = await query<DashboardRecord>(`SELECT * FROM dashboards WHERE id = $id`, { id });
  return rows[0] ?? null;
}

export async function listItems(dashboardId: string): Promise<DashboardItemRecord[]> {
  const rows = await query<DashboardItemRecord>(
    `SELECT * FROM dashboard_items WHERE dashboard_id = $dashboardId ORDER BY position ASC`,
    { dashboardId }
  );
  return rows.map(normalizeItem);
}

export async function getItem(dashboardId: string, itemId: string): Promise<DashboardItemRecord | null> {
  const rows = await query<DashboardItemRecord>(
    `SELECT * FROM dashboard_items WHERE id = $itemId AND dashboard_id = $dashboardId`,
    { itemId, dashboardId }
  );
  return rows[0] ? normalizeItem(rows[0]) : null;
}

export async function addItem(
  dashboardId: string,
  itemType: DashboardItemType,
  itemId: string
): Promise<DashboardItemRecord[]> {
  const current = await listItems(dashboardId);
  const conn = await getConnection();
  await conn.run(
    `INSERT INTO dashboard_items (dashboard_id, item_type, item_id, position)
     VALUES ($dashboardId, $itemType, $itemId, $position)`,
    { dashboardId, itemType, itemId, position: current.length }
  );
  return listItems(dashboardId);
}

export async function updateItemSize(
  dashboardId: string,
  itemId: string,
  size: DashboardItemSize
): Promise<DashboardItemRecord[]> {
  const conn = await getConnection();
  await conn.run(`UPDATE dashboard_items SET size = $size WHERE id = $id`, { id: itemId, size });
  return listItems(dashboardId);
}

export async function removeItem(dashboardId: string, itemId: string): Promise<DashboardItemRecord[]> {
  const conn = await getConnection();
  await conn.run(`DELETE FROM dashboard_items WHERE id = $id`, { id: itemId });
  const remaining = await listItems(dashboardId);
  await renumberPositions(remaining);
  return listItems(dashboardId);
}

export async function reorderItems(
  dashboardId: string,
  orderedItemIds: string[]
): Promise<DashboardItemRecord[]> {
  const current = await listItems(dashboardId);
  const byId = new Map(current.map((i) => [i.id, i]));
  const reordered = orderedItemIds
    .map((id) => byId.get(id))
    .filter((i): i is DashboardItemRecord => Boolean(i));

  if (reordered.length !== current.length) {
    throw new Error("La lista de reordenación no coincide con los widgets existentes.");
  }

  await renumberPositions(reordered);
  return listItems(dashboardId);
}

async function renumberPositions(items: DashboardItemRecord[]): Promise<void> {
  const conn = await getConnection();
  for (let i = 0; i < items.length; i++) {
    await conn.run(`UPDATE dashboard_items SET position = $position WHERE id = $id`, {
      position: i,
      id: items[i].id,
    });
  }
}
