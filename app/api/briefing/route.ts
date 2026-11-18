import { NextResponse, type NextRequest } from "next/server";
import { getBriefing } from "@/lib/briefing";
import { normalizeSymbol } from "@/lib/data";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "").split(",").map(normalizeSymbol).filter(Boolean).slice(0, 60);
  try {
    return NextResponse.json(await getBriefing(symbols), { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=3600" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
