import { NextResponse, type NextRequest } from "next/server";
import { scan } from "@/lib/scan";
import { UNIVERSES, type UniverseId } from "@/lib/universe";
import { normalizeSymbol } from "@/lib/data";

export const maxDuration = 60;

// GET /api/scan?universe=de|us|eu   oder   /api/scan?symbols=SAP.DE,AAPL
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const universe = p.get("universe") as UniverseId | null;
  let symbols: string[] = [];
  if (universe && universe in UNIVERSES) symbols = UNIVERSES[universe].symbols;
  else if (p.get("symbols")) symbols = p.get("symbols")!.split(",").map(normalizeSymbol).filter(Boolean).slice(0, 100);
  if (!symbols.length) return NextResponse.json({ error: "universe oder symbols angeben" }, { status: 400 });
  // Universen: 15 Min. Cache. Watchlist (symbols=…): minütlich aktuell.
  const fresh = !universe;
  const result = await scan(symbols, fresh ? 60_000 : 15 * 60_000);
  return NextResponse.json(result, {
    headers: { "Cache-Control": fresh ? "s-maxage=60" : "s-maxage=900, stale-while-revalidate=3600" },
  });
}
