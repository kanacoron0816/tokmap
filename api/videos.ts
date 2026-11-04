import { allowSearch, getPlace, hasDatabase, savePlace } from "./_lib/db.js";
import { findVideos } from "./_lib/search.js";
import type { PlaceResult } from "./_lib/types.js";

// GET /api/videos?placeId=...&name=...&address=...&lat=...&lng=...
// お店の TikTok 動画を探して返す。結果は保存してみんなで使い回す
export async function GET(request: Request): Promise<Response> {
  const p = new URL(request.url).searchParams;
  const placeId = p.get("placeId") ?? "";
  const name = (p.get("name") ?? "").slice(0, 100);
  const address = (p.get("address") ?? "").slice(0, 200);
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  if (!placeId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "placeId, name, lat, lng が必要です" }, { status: 400 });
  }

  const cached = await getPlace(placeId);
  if (cached) return Response.json({ ...cached, cached: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowSearch(ip))) {
    return Response.json({ error: "今日の検索回数の上限に達しました。明日また試してください" }, { status: 429 });
  }

  try {
    const { videos, related } = await findVideos(name, address);
    const place: PlaceResult = { placeId, name, address, lat, lng, videos, related, searchedAt: Date.now() };
    await savePlace(place);
    return Response.json({ ...place, cached: false, shared: hasDatabase });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "検索に失敗しました" }, { status: 502 });
  }
}
