import { NextResponse, type NextRequest } from "next/server";
import { getEarnings } from "@/lib/briefing";
import { normalizeSymbol } from "@/lib/data";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "").split(",").map(normalizeSymbol).filter(Boolean).slice(0, 60);
  try {
    return NextResponse.json(await getEarnings(symbols), { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=3600" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
