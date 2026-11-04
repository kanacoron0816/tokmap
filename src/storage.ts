const API_KEY_KEY = "tokmap.googleMapsApiKey";

/** ビルド時の環境変数を優先し、なければ画面から入力して端末に保存したキーを使う */
export function getApiKey(): string {
  const fromEnv = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem(API_KEY_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredApiKey(key: string | null) {
  try {
    if (key) localStorage.setItem(API_KEY_KEY, key);
    else localStorage.removeItem(API_KEY_KEY);
  } catch {
    // 保存できなくても今回のセッションでは使える
  }
}
