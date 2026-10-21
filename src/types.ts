export type Genre = "ラーメン" | "カフェ" | "焼肉" | "寿司" | "居酒屋" | "スイーツ" | "その他";

export const GENRES: Genre[] = ["ラーメン", "カフェ", "焼肉", "寿司", "居酒屋", "スイーツ", "その他"];

export const GENRE_EMOJI: Record<Genre, string> = {
  ラーメン: "🍜",
  カフェ: "☕️",
  焼肉: "🥩",
  寿司: "🍣",
  居酒屋: "🍺",
  スイーツ: "🍰",
  その他: "🍽",
};

export type TikTokVideo = {
  id: string; // TikTok の動画 ID（数字）
  url: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  addedAt: number;
};

export type Store = {
  id: string;
  name: string;
  genre: Genre;
  lat: number;
  lng: number;
  address?: string;
  placeId?: string; // Google マップ上のお店と紐付いている場合の Place ID
  videos: TikTokVideo[];
  isSample?: boolean;
};

/** 追加途中のお店（名前や位置がまだ決まっていないこともある） */
export type StoreDraft = {
  name: string;
  genre: Genre;
  lat?: number;
  lng?: number;
  address?: string;
  placeId?: string;
};

/** Google Places のお店の種類からジャンルを推測する */
export function guessGenre(primaryType?: string | null): Genre {
  const t = primaryType ?? "";
  if (t.includes("ramen")) return "ラーメン";
  if (t.includes("cafe") || t.includes("coffee") || t.includes("tea")) return "カフェ";
  if (t.includes("barbecue") || t.includes("yakiniku") || t.includes("steak")) return "焼肉";
  if (t.includes("sushi")) return "寿司";
  if (t.includes("izakaya") || t.includes("bar") || t.includes("pub")) return "居酒屋";
  if (t.includes("dessert") || t.includes("bakery") || t.includes("confectionery") || t.includes("ice_cream")) return "スイーツ";
  return "その他";
}
