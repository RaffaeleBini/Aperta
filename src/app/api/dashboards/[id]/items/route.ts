import { NextResponse } from "next/server";
import { addItem, getDashboard } from "@/lib/dashboards/dashboards";
import { addDashboardItemSchema } from "@/lib/dashboards/schemas";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  const body = addDashboardItemSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const items = await addItem(id, body.data.itemType, body.data.itemId);
  return NextResponse.json({ items }, { status: 201 });
}
