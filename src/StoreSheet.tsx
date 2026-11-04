import { useEffect, useState } from "react";
import { fetchVideos } from "./api";
import { searchUrl } from "./tiktok";
import type { Place, PlaceResult, Video } from "./types";
import { VideoFeed } from "./VideoFeed";

type Props = {
  place: Place;
  onClose: () => void;
  onLoaded: (result: PlaceResult) => void;
};

export function StoreSheet({ place, onClose, onLoaded }: Props) {
  const [result, setResult] = useState<PlaceResult | null>(null);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<{ list: Video[]; index: number } | null>(null);
  const [showRelated, setShowRelated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchVideos(place)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        onLoaded(r);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
    // place が変わったときだけ検索する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.placeId]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{place.name}</h2>
          <button className="text-button" onClick={onClose}>
            閉じる
          </button>
        </div>
        {place.address && <p className="sub">{place.address.replace(/^日本、\s*(〒\d{3}-\d{4}\s*)?/, "")}</p>}

        <div className="actions">
          <a className="action" href={mapsUrl} target="_blank" rel="noreferrer">
            🗺 Googleマップ
          </a>
          <a className="action dark" href={searchUrl(place.name)} target="_blank" rel="noreferrer">
            🎵 TikTokアプリで見る
          </a>
        </div>

        <h3>TikTok動画 {result && `${result.videos.length}本`}</h3>
        {!result && !error && (
          <div className="loading">
            <span className="spinner" />
            TikTokでこのお店の動画を探しています…
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {result && result.videos.length === 0 && (
          <p className="empty">
            このお店の動画は見つかりませんでした。
            <br />
            店名と地名の両方がキャプションやハッシュタグに入っている動画だけを表示しています。
          </p>
        )}
        {result && result.videos.length > 0 && (
          <VideoGrid videos={result.videos} onPlay={(index) => setPlaying({ list: result.videos, index })} />
        )}

        {result && result.related.length > 0 && (
          <>
            <button className="related-toggle" onClick={() => setShowRelated((v) => !v)}>
              {showRelated ? "▼" : "▶︎"} 店名だけ一致した動画 {result.related.length}本（別の店舗の可能性あり）
            </button>
            {showRelated && <VideoGrid videos={result.related} onPlay={(index) => setPlaying({ list: result.related, index })} />}
          </>
        )}

        {result && (
          <p className="note">
            {new Date(result.searchedAt).toLocaleDateString("ja-JP")} に検索した結果です
          </p>
        )}
      </div>

      {playing && <VideoFeed videos={playing.list} initialIndex={playing.index} storeName={place.name} onClose={() => setPlaying(null)} />}
    </>
  );
}

function VideoGrid({ videos, onPlay }: { videos: Video[]; onPlay: (index: number) => void }) {
  return (
    <div className="grid">
      {videos.map((v, i) => (
        <div key={v.id} className="thumb-wrap">
          <button className="thumb" onClick={() => onPlay(i)}>
            {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <span className="play">▶︎</span>
          </button>
          <span className="thumb-author">{v.author ? `@${v.author}` : "TikTok"}</span>
          <span className="thumb-caption">{v.caption}</span>
        </div>
      ))}
    </div>
  );
}
