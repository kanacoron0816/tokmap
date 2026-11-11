import { takeBraveQuota } from "./db.js";
import { matchVideo, storeKeywords } from "./match.js";
import type { Video } from "./types.js";

export class QuotaExceededError extends Error {
  constructor() {
    super("今月の動画検索の無料枠を使い切りました。調べ済みのお店は見られます。新しいお店は来月また調べられます");
  }
}

const VIDEO_URL_RE = /^https:\/\/(?:www\.)?tiktok\.com\/@([^/?#]+)\/video\/(\d{8,})/;

type BraveResult = { url: string; title?: string; description?: string };

/** Brave Search で TikTok の動画ページを探す */
async function braveSearch(query: string): Promise<BraveResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new Error("BRAVE_SEARCH_API_KEY が設定されていません");
  const params = new URLSearchParams({ q: query, count: "20", country: "JP", safesearch: "moderate" });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
  });
  if (!res.ok) throw new Error(`Brave Search: ${res.status} ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { web?: { results?: BraveResult[] } };
  return json.web?.results ?? [];
}

type OEmbed = { title?: string; author_unique_id?: string; author_name?: string; thumbnail_url?: string };

/** TikTok 公式 oEmbed で、キャプション全文（ハッシュタグ込み）とサムネイルを取る */
async function oembed(url: string): Promise<OEmbed | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? ((await res.json()) as OEmbed) : null;
  } catch {
    return null;
  }
}

/** 検索結果の文字は HTML タグや「| TikTok」が混ざるので取り除く */
function clean(text = ""): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s*[|｜]\s*TikTok.*$/i, "")
    .trim();
}

export async function findVideos(name: string, address: string) {
  const keywords = storeKeywords(name, address);
  const mainName = keywords.names[0] ?? name;
  const area = keywords.areas.find((a) => !/[区市町村]$/.test(a)) ?? keywords.areas[0] ?? "";

  // まず「店名＋地名」で探し、少なければ「店名」だけでも探す
  const queries = [`site:tiktok.com "${mainName}" ${area}`.trim(), `site:tiktok.com "${mainName}"`];
  const candidates = new Map<string, { url: string; author: string; text: string }>();
  for (const [i, q] of queries.entries()) {
    if (i > 0 && candidates.size >= 8) break;
    if (!(await takeBraveQuota())) {
      // 1 回目から枠がなければエラー、2 回目なら 1 回目の結果だけで判定する
      if (i === 0) throw new QuotaExceededError();
      break;
    }
    for (const r of await braveSearch(q)) {
      const m = r.url.match(VIDEO_URL_RE);
      if (!m || candidates.has(m[2])) continue;
      candidates.set(m[2], {
        url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}`,
        author: m[1],
        text: `${clean(r.title)} ${clean(r.description)}`,
      });
    }
  }

  const checked = await Promise.all(
    [...candidates.entries()].slice(0, 24).map(async ([id, c]) => {
      const meta = await oembed(c.url);
      // キャプション（oEmbed）を優先し、取れなければ検索結果の文章で判定する
      const caption = meta?.title?.trim() || c.text;
      const video: Video = {
        id,
        url: c.url,
        caption,
        author: meta?.author_unique_id || c.author,
        thumbnailUrl: meta?.thumbnail_url,
      };
      return { video, result: matchVideo(`${caption} ${c.text}`, keywords) };
    }),
  );

  return {
    videos: checked.filter((c) => c.result === "confirmed").map((c) => c.video),
    related: checked.filter((c) => c.result === "name-only").map((c) => c.video),
  };
}
