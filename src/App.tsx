import { Component, useEffect, useState, type ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { KeySetup } from "./KeySetup";
import { MapScreen } from "./MapScreen";
import { getApiKey, setStoredApiKey } from "./storage";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

export default function App() {
  const [apiKey, setApiKey] = useState(getApiKey);
  const [keyError, setKeyError] = useState("");

  const resetKey = (message = "") => {
    setStoredApiKey(null);
    setApiKey("");
    setKeyError(message);
  };

  // Google Maps はキーが無効なときこの関数を呼ぶ。地図が壊れた状態で動き続けないよう入力画面に戻す
  useEffect(() => {
    window.gm_authFailure = () =>
      resetKey("このキーは使えませんでした。Maps JavaScript API が有効か、キーの制限（許可するウェブサイト）を確認してください。");
  }, []);

  if (!apiKey) {
    return (
      <KeySetup
        error={keyError}
        onSave={(key) => {
          setStoredApiKey(key);
          setKeyError("");
          setApiKey(key);
        }}
      />
    );
  }

  return (
    <ErrorBoundary onReset={() => resetKey()}>
      <APIProvider apiKey={apiKey} language="ja" region="JP">
        <MapScreen onResetKey={() => resetKey()} />
      </APIProvider>
    </ErrorBoundary>
  );
}

/** 予期しないエラーで画面が真っ白にならないようにする */
class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="setup">
        <h1>😵</h1>
        <p>エラーが発生しました</p>
        <div className="setup-card">
          <button className="primary" onClick={() => location.reload()}>
            再読み込み
          </button>
          <button className="secondary wide" onClick={this.props.onReset}>
            API キーを入力し直す
          </button>
        </div>
      </div>
    );
  }
}
