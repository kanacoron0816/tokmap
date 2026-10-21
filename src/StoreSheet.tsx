import { useState } from "react";
import { fetchTikTokVideo, searchUrl } from "./tiktok";
import { GENRE_EMOJI, type Store, type TikTokVideo } from "./types";
import { VideoFeed } from "./VideoFeed";

type Props = {
  store: Store;
  onClose: () => void;
  onAddVideo: (video: TikTokVideo) => void;
  onRemoveVideo: (videoId: string) => void;
  onDeleteStore: () => void;
};

export function StoreSheet({ store, onClose, onAddVideo, onRemoveVideo, onDeleteStore }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  const addVideo = async () => {
    setLoading(true);
    setError("");
    try {
      const video = await fetchTikTokVideo(url);
      if (store.videos.some((v) => v.id === video.id)) {
        setError("この動画はすでに紐付けられています");
      } else {
        onAddVideo(video);
        setUrl("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      setUrl(await navigator.clipboard.readText());
    } catch {
      // 許可されない場合は手入力してもらう
    }
  };

  const mapsUrl = store.placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}&query_place_id=${store.placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>
            {GENRE_EMOJI[store.genre]} {store.name}
          </h2>
          <button className="text-button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <p className="sub">
          {store.genre} ・ TikTok動画 {store.videos.length}本{store.isSample ? " ・ サンプル" : ""}
        </p>
        {store.address && <p className="sub">{store.address}</p>}

        <div className="actions">
          <a className="action" href={mapsUrl} target="_blank" rel="noreferrer">
            🗺 Googleマップ
          </a>
          <a className="action dark" href={searchUrl(store.name)} target="_blank" rel="noreferrer">
            🎵 TikTokで探す
          </a>
        </div>

        <div className="section-head">
          <h3>動画</h3>
          {store.videos.length > 0 && (
            <button className="text-button" onClick={() => setEditing((e) => !e)}>
              {editing ? "完了" : "編集"}
            </button>
          )}
        </div>
        {store.videos.length === 0 ? (
          <p className="empty">
            まだ動画がありません。
            <br />
            「TikTokで探す」で動画を見つけて、共有 →「リンクをコピー」したURLを下に貼り付けてください。
          </p>
        ) : (
          <div className="grid">
            {store.videos.map((v, i) => (
              <div key={v.id} className="thumb-wrap">
                <button className="thumb" onClick={() => setPlayingIndex(i)}>
                  {v.thumbnailUrl ? (
                    <img src={v.thumbnailUrl} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : null}
                  <span className="play">▶︎</span>
                </button>
                <span className="thumb-author">{v.author ? `@${v.author}` : "TikTok"}</span>
                {editing && (
                  <button className="remove" onClick={() => onRemoveVideo(v.id)} aria-label="紐付けを解除">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <h3>TikTok動画を紐付ける</h3>
        <div className="input-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@.../video/..."
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
          />
          {!url && "clipboard" in navigator && (
            <button className="secondary" onClick={pasteFromClipboard}>
              貼付
            </button>
          )}
          <button className="primary" disabled={!url || loading} onClick={addVideo}>
            {loading ? "…" : "追加"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <button
          className="danger-link"
          onClick={() => confirm(`「${store.name}」を地図から削除しますか？`) && onDeleteStore()}
        >
          このお店を削除
        </button>
      </div>

      {playingIndex !== null && (
        <VideoFeed videos={store.videos} initialIndex={playingIndex} storeName={store.name} onClose={() => setPlayingIndex(null)} />
      )}
    </>
  );
}
