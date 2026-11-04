export type Video = {
  id: string;
  url: string;
  caption: string;
  author?: string;
  thumbnailUrl?: string;
};

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** このお店の動画（店名＋地名が一致） */
  videos: Video[];
  /** 店名だけ一致した動画（別の店舗の可能性あり） */
  related: Video[];
  searchedAt: number;
};

/** 地図に出す要約 */
export type PlaceSummary = Pick<PlaceResult, "placeId" | "name" | "lat" | "lng"> & { count: number };
