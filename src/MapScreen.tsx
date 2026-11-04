import { useRef, useState } from "react";
import { AdvancedMarker, Map, type MapEvent, type MapMouseEvent, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { fetchStores } from "./api";
import { StoreSheet } from "./StoreSheet";
import type { Place, PlaceSummary } from "./types";

const SHIBUYA = { lat: 35.6595, lng: 139.7005 };
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAP_ID as string | undefined) || "DEMO_MAP_ID";

export function MapScreen({ onResetKey }: { onResetKey: () => void }) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [summaries, setSummaries] = useState<Record<string, PlaceSummary>>({});
  const [onlyWithVideos, setOnlyWithVideos] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<google.maps.places.Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const idleTimer = useRef<number | undefined>(undefined);

  const markers = Object.values(summaries).filter((s) => !onlyWithVideos || s.count > 0);

  /** 地図を動かし終わったら、その範囲の検索済みのお店（動画の有無）を読み込む */
  const onIdle = (e: MapEvent) => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(async () => {
      const bounds = e.map.getBounds()?.toJSON();
      if (!bounds) return;
      const places = await fetchStores(bounds);
      setSummaries((prev) => ({ ...prev, ...Object.fromEntries(places.map((p) => [p.placeId, p])) }));
    }, 300);
  };

  const toPlace = (p: google.maps.places.Place): Place | null =>
    p.location
      ? { placeId: p.id, name: p.displayName ?? "", address: p.formattedAddress ?? "", lat: p.location.lat(), lng: p.location.lng() }
      : null;

  const open = (place: Place) => {
    setSelected(place);
    map?.panTo({ lat: place.lat, lng: place.lng });
  };

  /** Google マップ上のお店（またはピン）をタップ → 詳細を取って動画を探す */
  const openPlaceId = async (placeId: string) => {
    if (!placesLib) return;
    const place = new placesLib.Place({ id: placeId, requestedLanguage: "ja" });
    try {
      await place.fetchFields({ fields: ["displayName", "location", "formattedAddress"] });
    } catch {
      alert("お店の情報を取得できませんでした。Google Cloud で「Places API (New)」が有効か確認してください");
      return;
    }
    const p = toPlace(place);
    if (p) open(p);
  };

  const onMapClick = (e: MapMouseEvent) => {
    if (!e.detail.placeId) return;
    e.stop(); // Google 標準の吹き出しを出さない
    openPlaceId(e.detail.placeId);
  };

  const search = async () => {
    if (!placesLib || !query.trim()) return;
    setSearching(true);
    try {
      let center: google.maps.LatLngLiteral | undefined;
      try {
        center = map?.getCenter()?.toJSON();
      } catch {
        // 地図の読み込みに失敗していても検索はできる
      }
      const { places } = await placesLib.Place.searchByText({
        textQuery: query,
        fields: ["id", "displayName", "location", "formattedAddress"],
        locationBias: center,
        maxResultCount: 8,
        language: "ja",
        region: "jp",
      });
      setResults(places);
      if (places.length === 0) alert("見つかりませんでした");
    } catch {
      alert("検索できませんでした。Google Cloud で「Places API (New)」が有効か確認してください");
    } finally {
      setSearching(false);
    }
  };

  const goToCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setMyLocation(pos);
        map?.panTo(pos);
        map?.setZoom(17);
      },
      () => alert("位置情報を取得できませんでした。設定で位置情報の利用を許可してください"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="app">
      <Map
        className="map"
        mapId={MAP_ID}
        defaultCenter={SHIBUYA}
        defaultZoom={17}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons
        onClick={onMapClick}
        onIdle={onIdle}
      >
        {markers.map((s) => (
          <AdvancedMarker key={s.placeId} position={{ lat: s.lat, lng: s.lng }} onClick={() => openPlaceId(s.placeId)} zIndex={s.count + 1}>
            {s.count > 0 ? (
              <div className={`pin hot ${s.placeId === selected?.placeId ? "selected" : ""}`}>
                <span className="pin-count">▶︎{s.count}</span>
              </div>
            ) : (
              <div className="pin-none" title="動画なし" />
            )}
          </AdvancedMarker>
        ))}
        {myLocation && (
          <AdvancedMarker position={myLocation} zIndex={0}>
            <div className="my-location" />
          </AdvancedMarker>
        )}
      </Map>

      <div className="top">
        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <input
            className="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setResults([]);
            }}
            placeholder="🔍 店名・エリアで検索"
            type="search"
            enterKeyHint="search"
          />
          <button type="button" className="icon-button" onClick={() => confirm("Google Maps の API キーを入力し直しますか？") && onResetKey()} aria-label="設定">
            ⚙︎
          </button>
        </form>
        {(results.length > 0 || searching) && (
          <ul className="suggestions">
            {searching && <li className="suggestions-empty">検索中…</li>}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    const p = toPlace(r);
                    setResults([]);
                    if (p) open(p);
                  }}
                >
                  <strong>{r.displayName}</strong>
                  <span className="suggestion-sub">{r.formattedAddress?.replace(/^日本、\s*(〒\d{3}-\d{4}\s*)?/, "")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="chips">
          <button className={`chip ${onlyWithVideos ? "tiktok" : ""}`} onClick={() => setOnlyWithVideos((v) => !v)}>
            🎵 動画ありだけ
          </button>
          <span className="legend">
            <span className="pin hot mini">▶︎3</span> 動画あり <span className="pin-none" /> 動画なし
          </span>
        </div>
      </div>

      <div className="hint">お店をタップするとTikTok動画を探します</div>

      <div className="fabs">
        <button className="fab" onClick={goToCurrentLocation} aria-label="現在地">
          📍
        </button>
      </div>

      {selected && (
        <StoreSheet
          key={selected.placeId}
          place={selected}
          onClose={() => setSelected(null)}
          onLoaded={(r) =>
            setSummaries((prev) => ({
              ...prev,
              [r.placeId]: { placeId: r.placeId, name: r.name, lat: r.lat, lng: r.lng, count: r.videos.length },
            }))
          }
        />
      )}
    </div>
  );
}
