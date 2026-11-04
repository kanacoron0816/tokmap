export type { PlaceResult, PlaceSummary, Video } from "../api/_lib/types";

/** 地図でタップしたお店 */
export type Place = {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};
