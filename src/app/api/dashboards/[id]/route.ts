import { NextResponse } from "next/server";
import { deleteDashboard, getDashboard, listItems, renameDashboard } from "@/lib/dashboards/dashboards";
import { renameDashboardSchema } from "@/lib/dashboards/schemas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  const items = await listItems(id);
  return NextResponse.json({ dashboard, items });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  const body = renameDashboardSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const updated = await renameDashboard(id, body.data.name);
  return NextResponse.json({ dashboard: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard no encontrado." }, { status: 404 });
  }

  await deleteDashboard(id);
  return NextResponse.json({ ok: true });
}
