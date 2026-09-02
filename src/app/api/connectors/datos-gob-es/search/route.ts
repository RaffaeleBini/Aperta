import { NextResponse } from "next/server";
import { searchDatasets } from "@/lib/connectors/datos-gob-es";
import { catalogSearchSchema } from "@/lib/connectors/schemas";

export async function POST(req: Request) {
  const body = catalogSearchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const datasets = await searchDatasets(body.data.keyword);
    return NextResponse.json({ datasets });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 502 }
    );
  }
}
