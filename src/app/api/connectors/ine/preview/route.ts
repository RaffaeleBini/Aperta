import { NextResponse } from "next/server";
import { previewIneDataset } from "@/lib/connectors/ine";
import { ineSourceSchema } from "@/lib/connectors/schemas";

export async function POST(req: Request) {
  const body = ineSourceSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const preview = await previewIneDataset(body.data);
    return NextResponse.json(preview);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido." },
      { status: 502 }
    );
  }
}
