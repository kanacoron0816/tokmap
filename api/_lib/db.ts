import { Redis } from "@upstash/redis";
import type { PlaceResult, PlaceSummary } from "./types.js";

// Vercel の Marketplace で Upstash Redis をつなぐと、どちらかの名前で環境変数が入る
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const GEO_KEY = "places:geo";
const TTL_SECONDS = 60 * 60 * 24 * 14; // 検索結果は 2 週間使い回す
const placeKey = (placeId: string) => `place:${placeId}`;

export const hasDatabase = !!redis;

export async function getPlace(placeId: string): Promise<PlaceResult | null> {
  return redis ? await redis.get<PlaceResult>(placeKey(placeId)) : null;
}

export async function savePlace(place: PlaceResult): Promise<void> {
  if (!redis) return;
  await redis.set(placeKey(place.placeId), place, { ex: TTL_SECONDS });
  await redis.geoadd(GEO_KEY, { longitude: place.lng, latitude: place.lat, member: place.placeId });
}

/** 地図に表示している範囲の、検索済みのお店 */
export async function placesInBox(lat: number, lng: number, widthKm: number, heightKm: number): Promise<PlaceSummary[]> {
  if (!redis) return [];
  const ids = await redis.geosearch<string>(
    GEO_KEY,
    { type: "FROMLONLAT", coordinate: { lon: lng, lat } },
    { type: "BYBOX", rect: { width: widthKm, height: heightKm }, rectType: "KM" },
    "ASC",
    { count: { limit: 300 } },
  );
  const members = ids.map((r) => r.member);
  if (members.length === 0) return [];
  const places = await redis.mget<(PlaceResult | null)[]>(...members.map(placeKey));
  const expired = members.filter((_, i) => !places[i]);
  if (expired.length) await redis.zrem(GEO_KEY, ...expired);
  return places
    .filter((p): p is PlaceResult => !!p)
    .map((p) => ({ placeId: p.placeId, name: p.name, lat: p.lat, lng: p.lng, count: p.videos.length }));
}

/** 検索 API の使いすぎを防ぐ：1 つの IP から 1 日あたりの新規検索回数を制限する */
export async function allowSearch(ip: string, limitPerDay = 200): Promise<boolean> {
  if (!redis) return true;
  const key = `ratelimit:${new Date().toISOString().slice(0, 10)}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 60 * 24);
  return count <= limitPerDay;
}

/** 合言葉の総当たりを防ぐ：1 つの IP から 1 時間に間違えられる回数を制限する */
export async function allowPasscodeAttempt(ip: string, limitPerHour = 10): Promise<boolean> {
  if (!redis) return true;
  const key = `passcode-fail:${ip}`;
  const count = Number((await redis.get<number>(key)) ?? 0);
  return count < limitPerHour;
}

export async function recordPasscodeFailure(ip: string): Promise<void> {
  if (!redis) return;
  const key = `passcode-fail:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60 * 60);
}

// Brave Search の無料クレジット（月 5 ドル ≒ 1,000 回）を超えないよう、アプリ側でも月の回数を数えて止める
export const BRAVE_MONTHLY_LIMIT = Number(process.env.BRAVE_MONTHLY_LIMIT) || 900;
const braveKey = () => `usage:brave:${new Date().toISOString().slice(0, 7)}`;

/** Brave Search を 1 回使ってよいか。よければ回数を 1 つ増やす */
export async function takeBraveQuota(): Promise<boolean> {
  if (!redis) return true;
  const count = await redis.incr(braveKey());
  if (count === 1) await redis.expire(braveKey(), 60 * 60 * 24 * 40);
  return count <= BRAVE_MONTHLY_LIMIT;
}

export async function braveUsage(): Promise<{ used: number; limit: number }> {
  const used = redis ? Number((await redis.get<number>(braveKey())) ?? 0) : 0;
  return { used: Math.min(used, BRAVE_MONTHLY_LIMIT), limit: BRAVE_MONTHLY_LIMIT };
}
