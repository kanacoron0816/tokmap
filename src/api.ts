import type { Place, PlaceResult, PlaceSummary } from "./types";

/** お店の TikTok 動画を探す（サーバーで検索・照合し、結果は保存されてみんなで共有される） */
export async function fetchVideos(place: Place): Promise<PlaceResult> {
  const params = new URLSearchParams({
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    lat: String(place.lat),
    lng: String(place.lng),
  });
  const res = await fetch(`/api/videos?${params}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(json?.error ?? "動画を検索できませんでした");
  return json;
}

/** 地図の表示範囲にある、動画を検索済みのお店 */
export async function fetchStores(bounds: google.maps.LatLngBoundsLiteral): Promise<PlaceSummary[]> {
  const params = new URLSearchParams({
    n: String(bounds.north),
    s: String(bounds.south),
    e: String(bounds.east),
    w: String(bounds.west),
  });
  try {
    const res = await fetch(`/api/stores?${params}`);
    if (!res.ok) return [];
    return (await res.json()).places ?? [];
  } catch {
    return [];
  }
}
