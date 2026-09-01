import { NextResponse } from "next/server";
import { getDashboard, removeItem, updateItemSize } from "@/lib/dashboards/dashboards";
import { updateDashboardItemSchema } from "@/lib/dashboards/schemas";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  const body = updateDashboardItemSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const items = await updateItemSize(id, itemId, body.data.size);
  return NextResponse.json({ items });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  const items = await removeItem(id, itemId);
  return NextResponse.json({ items });
}
