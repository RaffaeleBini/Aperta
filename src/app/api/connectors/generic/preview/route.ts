import { NextResponse } from "next/server";
import { previewGenericSource } from "@/lib/connectors/generic";
import { genericSourceSchema } from "@/lib/connectors/schemas";

export async function POST(req: Request) {
  const body = genericSourceSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const preview = await previewGenericSource(body.data);
    return NextResponse.json(preview);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 502 }
    );
  }
}
