import { useState } from "react";
import { checkPasscode } from "./api";

/** 合言葉を知っている人だけが使えるようにする入口の画面 */
export function PasscodeGate({ onUnlock }: { onUnlock: (passcode: string) => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    setChecking(true);
    setError("");
    const err = await checkPasscode(passcode.trim());
    setChecking(false);
    if (err) setError(err);
    else onUnlock(passcode.trim());
  };

  return (
    <div className="setup">
      <h1>🎵🗺 TokMap</h1>
      <p>TikTok動画が見られるお店探しマップ</p>
      <form
        className="setup-card"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2>合言葉を入力</h2>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="合言葉"
          autoComplete="current-password"
          autoFocus
        />
        <button className="primary" disabled={!passcode.trim() || checking}>
          {checking ? "確認中…" : "はじめる"}
        </button>
        {error && <p className="error">{error}</p>}
        <p className="note">一度入力すると、この端末では次から入力不要です。</p>
      </form>
    </div>
  );
}
