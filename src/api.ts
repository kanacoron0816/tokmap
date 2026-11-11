import { getPasscode, setPasscode } from "./storage";
import type { Place, PlaceResult, PlaceSummary } from "./types";

/** 合言葉が違う・変わったときに App へ知らせ、入力画面に戻す */
export const LOCKED_EVENT = "tokmap:locked";

/** 合言葉を付けて API を呼ぶ（ヘッダーは ASCII だけなので URL エンコードする） */
async function apiFetch(path: string, passcode = getPasscode()): Promise<Response> {
  const res = await fetch(path, { headers: { "x-tokmap-passcode": encodeURIComponent(passcode) } });
  if (res.status === 401) {
    setPasscode(null);
    window.dispatchEvent(new Event(LOCKED_EVENT));
  }
  return res;
}

/** 合言葉が正しいか確かめる。正しくなければエラーメッセージを返す */
export async function checkPasscode(passcode: string): Promise<string | null> {
  try {
    const res = await fetch("/api/auth", { headers: { "x-tokmap-passcode": encodeURIComponent(passcode) } });
    if (res.ok) return null;
    return (await res.json().catch(() => null))?.error ?? "確認できませんでした";
  } catch {
    return "通信できませんでした。電波の良いところでもう一度試してください";
  }
}

/** お店の TikTok 動画を探す（サーバーで検索・照合し、結果は保存されてみんなで共有される） */
export async function fetchVideos(place: Place): Promise<PlaceResult> {
  const params = new URLSearchParams({
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    lat: String(place.lat),
    lng: String(place.lng),
  });
  const res = await apiFetch(`/api/videos?${params}`);
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
    const res = await apiFetch(`/api/stores?${params}`);
    if (!res.ok) return [];
    return (await res.json()).places ?? [];
  } catch {
    return [];
  }
}
