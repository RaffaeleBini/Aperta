import { NextResponse } from "next/server";
import { getDashboard, reorderItems } from "@/lib/dashboards/dashboards";
import { reorderDashboardItemsSchema } from "@/lib/dashboards/schemas";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  const body = reorderDashboardItemsSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const items = await reorderItems(id, body.data.orderedItemIds);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 400 }
    );
  }
}
