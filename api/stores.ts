import { requirePasscode } from "./_lib/auth.js";
import { placesInBox } from "./_lib/db.js";

// GET /api/stores?n=..&s=..&e=..&w=..  地図の表示範囲にある、検索済みのお店
export async function GET(request: Request): Promise<Response> {
  const denied = await requirePasscode(request);
  if (denied) return denied;

  const p = new URL(request.url).searchParams;
  const [n, s, e, w] = ["n", "s", "e", "w"].map((k) => Number(p.get(k)));
  if (![n, s, e, w].every(Number.isFinite)) return Response.json({ error: "n, s, e, w が必要です" }, { status: 400 });

  const lat = (n + s) / 2;
  const lng = (e + w) / 2;
  const heightKm = Math.min((n - s) * 111, 50);
  const widthKm = Math.min((e - w) * 111 * Math.cos((lat * Math.PI) / 180), 50);
  const places = await placesInBox(lat, lng, widthKm, heightKm);
  return Response.json({ places }, { headers: { "cache-control": "private, max-age=30" } });
}
