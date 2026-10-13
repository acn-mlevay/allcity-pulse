import { NextRequest, NextResponse } from "next/server";
import { applyPush } from "@/lib/live";
import { hubSecret, verifySignature } from "@/lib/websub";

export const dynamic = "force-dynamic";

/** Hub verification: echo the challenge for subscriptions we asked for. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const challenge = p.get("hub.challenge");
  if (!challenge || !p.get("market") || !p.get("feed")) return new NextResponse("bad request", { status: 400 });
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/** Content push: verify the signature, then merge the new entries into the live feed. */
export async function POST(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") || "";
  const feed = req.nextUrl.searchParams.get("feed") || "";
  const body = await req.text();
  if (!verifySignature(req.headers.get("x-hub-signature"), body, hubSecret(market, feed))) {
    // 2xx so the hub doesn't retry forever; unsigned pushes are ignored.
    return new NextResponse("ignored", { status: 202 });
  }
  try {
    const added = await applyPush(market, feed, body);
    return NextResponse.json({ ok: true, added });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 202 });
  }
}
