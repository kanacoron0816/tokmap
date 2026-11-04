/** TikTok 公式の埋め込みプレイヤー */
export function embedPlayerUrl(videoId: string): string {
  return `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&loop=1&music_info=1&description=1&rel=0`;
}

/** お店の名前で TikTok を検索する URL */
export function searchUrl(query: string): string {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;
}
