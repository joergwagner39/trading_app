import { NextResponse, type NextRequest } from "next/server";
import { search } from "@/lib/data";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await search(req.nextUrl.searchParams.get("q") ?? ""));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
