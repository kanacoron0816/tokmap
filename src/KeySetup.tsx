import { useState } from "react";

export function KeySetup({ onSave, error }: { onSave: (key: string) => void; error?: string }) {
  const [key, setKey] = useState("");
  return (
    <div className="setup">
      <h1>🎵🗺 TokMap</h1>
      <p>TikTok動画が見られるお店探しマップ</p>
      <div className="setup-card">
        <h2>Google Maps の API キーを入力</h2>
        <ol>
          <li>
            <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noreferrer">
              Google Cloud Console
            </a>
            でプロジェクトを作成
          </li>
          <li>「Maps JavaScript API」と「Places API (New)」を有効化</li>
          <li>「認証情報」で API キーを作成し、下に貼り付け</li>
        </ol>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza..."
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className="primary" disabled={!key.trim()} onClick={() => onSave(key.trim())}>
          はじめる
        </button>
        {error && <p className="error">{error}</p>}
        <p className="note">キーはこの端末の中にだけ保存されます。</p>
      </div>
    </div>
  );
}
