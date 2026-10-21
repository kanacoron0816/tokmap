// Vercel にデプロイしたときだけ動くサーバー関数。
// ブラウザからはできない「短縮 URL の展開」と「oEmbed の取得」を代わりに行う。
const VIDEO_ID_RE = /\/(?:video|photo)\/(\d{8,})/;

export async function GET(request: Request): Promise<Response> {
  const input = new URL(request.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(input);
  } catch {
    return Response.json({ error: "invalid url" }, { status: 400 });
  }
  if (!/(^|\.)tiktok\.com$/.test(target.hostname)) {
    return Response.json({ error: "not a tiktok url" }, { status: 400 });
  }

  let url = target.toString();
  if (!VIDEO_ID_RE.test(url)) {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } });
    url = res.url;
  }
  url = url.split("?")[0];

  let meta: { title?: string; author_name?: string; thumbnail_url?: string; embed_product_id?: string } = {};
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    if (res.ok) meta = await res.json();
  } catch {
    // ID だけでも返す
  }

  const id = url.match(VIDEO_ID_RE)?.[1] ?? meta.embed_product_id;
  if (!id) return Response.json({ error: "video id not found" }, { status: 404 });

  return Response.json(
    { id, url, title: meta.title, author: meta.author_name, thumbnailUrl: meta.thumbnail_url },
    { headers: { "cache-control": "public, max-age=86400" } },
  );
}
