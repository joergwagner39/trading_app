import { NextResponse, type NextRequest } from "next/server";
import { scan } from "@/lib/scan";
import { UNIVERSES, type UniverseId } from "@/lib/universe";
import { getHoldings, normalizeSymbol } from "@/lib/data";

export const maxDuration = 60;

// GET /api/scan?universe=de|us|eu|all|etf|etfeu
//     /api/scan?symbols=SAP.DE,AAPL
//     /api/scan?holdings=XLK   (größte Positionen eines ETFs)
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const universe = p.get("universe") as UniverseId | null;
  let symbols: string[] = [];
  let weights: Record<string, number | null> | null = null;
  let etf: { symbol: string; name: string; source: string } | null = null;
  if (universe && universe in UNIVERSES) symbols = UNIVERSES[universe].symbols;
  else if (p.get("holdings")) {
    const h = await getHoldings(p.get("holdings")!);
    symbols = h.holdings.map((x) => x.symbol).slice(0, 50);
    weights = Object.fromEntries(h.holdings.map((x) => [x.symbol, x.weight]));
    etf = { symbol: h.etf, name: h.name, source: h.source };
  } else if (p.get("symbols")) symbols = p.get("symbols")!.split(",").map(normalizeSymbol).filter(Boolean).slice(0, 100);
  if (!symbols.length) return NextResponse.json({ error: "Keine Werte gefunden" }, { status: 400 });

  // Universen/ETFs: 15 Min. Cache. Watchlist (symbols=…): minütlich aktuell.
  const fresh = !universe && !etf;
  const result = await scan(symbols, fresh ? 60_000 : 15 * 60_000);
  if (weights) for (const r of result.rows) r.weight = weights[r.symbol] ?? null;
  return NextResponse.json(
    { ...result, etf },
    { headers: { "Cache-Control": fresh ? "s-maxage=60" : "s-maxage=900, stale-while-revalidate=3600" } },
  );
}
