import { NextResponse } from "next/server";
import { getNews } from "@/lib/data";

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  try {
    return NextResponse.json(await getNews(symbol), { headers: { "Cache-Control": "s-maxage=600" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
