import { NextResponse } from "next/server";
import { previewEurostatDataset } from "@/lib/connectors/eurostat";
import { eurostatSourceSchema } from "@/lib/connectors/schemas";

export async function POST(req: Request) {
  const body = eurostatSourceSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  try {
    const preview = await previewEurostatDataset(body.data);
    return NextResponse.json(preview);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto." },
      { status: 502 }
    );
  }
}
