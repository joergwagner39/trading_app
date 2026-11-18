import { NextResponse } from "next/server";
import { getHistory } from "@/lib/data";
import { analyze } from "@/lib/analysis";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  try {
    const h = await getHistory(symbol);
    if (h.candles.length < 30) return NextResponse.json({ error: "Zu wenig Kursdaten" }, { status: 404 });
    return NextResponse.json(
      { ...h, analysis: analyze(h.candles) },
      { headers: { "Cache-Control": "s-maxage=60" } },
    );
  } catch (e) {
    return NextResponse.json({ error: `Keine Daten für ${symbol}: ${(e as Error).message}` }, { status: 502 });
  }
}
