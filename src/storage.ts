import type { Store } from "./types";

const STORES_KEY = "tokmap.stores.v1";
const API_KEY_KEY = "tokmap.googleMapsApiKey";

// 動作確認用のサンプル（架空のお店）
const SAMPLE_STORES: Store[] = [
  { id: "sample-1", name: "サンプル らーめん屋", genre: "ラーメン", lat: 35.6595, lng: 139.7005, videos: [], isSample: true },
  { id: "sample-2", name: "サンプル カフェ", genre: "カフェ", lat: 35.6628, lng: 139.6982, videos: [], isSample: true },
  { id: "sample-3", name: "サンプル 焼肉", genre: "焼肉", lat: 35.6573, lng: 139.7037, videos: [], isSample: true },
];

export function loadStores(): Store[] {
  try {
    const json = localStorage.getItem(STORES_KEY);
    if (json) return JSON.parse(json);
  } catch {
    // 読めない場合はサンプルから始める
  }
  return SAMPLE_STORES;
}

export function saveStores(stores: Store[]) {
  try {
    localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  } catch {
    // プライベートブラウズなどで保存できない場合は何もしない
  }
}

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
