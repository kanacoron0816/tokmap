import { useEffect, useRef, useState } from "react";
import { embedPlayerUrl } from "./tiktok";
import type { TikTokVideo } from "./types";

type Props = {
  videos: TikTokVideo[];
  initialIndex: number;
  storeName: string;
  onClose: () => void;
};

/** TikTok のように縦スワイプで動画を切り替えるフルスクリーンプレイヤー */
export function VideoFeed({ videos, initialIndex, storeName, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.clientHeight * initialIndex;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: list, threshold: 0.6 },
    );
    list.querySelectorAll(".feed-item").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [initialIndex]);

  return (
    <div className="feed">
      <div className="feed-list" ref={listRef}>
        {videos.map((v, i) => (
          <div className="feed-item" key={v.id} data-index={i}>
            {/* 表示中の動画だけ iframe を作り、同時再生と重さを防ぐ */}
            {i === current && (
              <iframe
                src={embedPlayerUrl(v.id)}
                title={v.title ?? "TikTok"}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        ))}
      </div>
      <div className="feed-header">
        <span className="feed-store">📍 {storeName}</span>
        <button className="feed-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
      </div>
      {videos.length > 1 && (
        <div className="feed-counter">
          {current + 1} / {videos.length}
        </div>
      )}
    </div>
  );
}
