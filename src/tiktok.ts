import type { TikTokVideo } from "./types";

const VIDEO_ID_RE = /\/(?:video|photo)\/(\d{8,})/;

type VideoInfo = Omit<TikTokVideo, "addedAt">;

/** Vercel の /api/tiktok（短縮 URL の展開と oEmbed をサーバー側で行う）。静的ホスティングでは存在しない */
async function viaServer(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch(`/api/tiktok?url=${encodeURIComponent(url)}`);
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** ブラウザから直接 oEmbed を取得（CORS で失敗することもあるので、取れたらラッキー程度） */
async function oembed(url: string) {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string; embed_product_id?: string };
  } catch {
    return null;
  }
}

/** TikTok の共有 URL（コピーした文章ごとでも可）から動画情報を取得する */
export async function fetchTikTokVideo(input: string): Promise<TikTokVideo> {
  const raw = input.trim().match(/https?:\/\/\S+/)?.[0];
  if (!raw || !/tiktok\.com/.test(raw)) {
    throw new Error("TikTok の動画 URL を貼り付けてください");
  }

  const server = await viaServer(raw);
  if (server?.id) return { ...server, addedAt: Date.now() };

  const url = raw.split("?")[0];
  const meta = await oembed(url);
  const id = url.match(VIDEO_ID_RE)?.[1] ?? meta?.embed_product_id;
  if (!id) {
    throw new Error(
      "動画 ID を読み取れませんでした。短縮 URL（vm.tiktok.com など）の場合は、一度ブラウザで開いて、表示された「…/video/数字」の URL をコピーしてください",
    );
  }
  return {
    id,
    url,
    title: meta?.title,
    author: meta?.author_name,
    thumbnailUrl: meta?.thumbnail_url,
    addedAt: Date.now(),
  };
}

/** TikTok 公式の埋め込みプレイヤー */
export function embedPlayerUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&loop=1&music_info=1&description=1&rel=0`;
}

/** お店の名前で TikTok を検索する URL */
export function searchUrl(storeName: string): string {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(storeName)}`;
}
