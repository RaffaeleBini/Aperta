import { NextResponse } from "next/server";
import { createDashboard, listDashboards } from "@/lib/dashboards/dashboards";
import { createDashboardSchema } from "@/lib/dashboards/schemas";

export async function GET() {
  const dashboards = await listDashboards();
  return NextResponse.json({ dashboards });
}

export async function POST(req: Request) {
  const body = createDashboardSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const dashboard = await createDashboard(body.data.name);
  return NextResponse.json({ dashboard }, { status: 201 });
}
