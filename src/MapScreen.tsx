import { useEffect, useMemo, useState } from "react";
import { AdvancedMarker, Map, type MapMouseEvent, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { AddStoreSheet } from "./AddStoreSheet";
import { StoreSheet } from "./StoreSheet";
import { loadStores, saveStores } from "./storage";
import { GENRE_EMOJI, GENRES, guessGenre, type Genre, type Store, type StoreDraft, type TikTokVideo } from "./types";

const SHIBUYA = { lat: 35.6595, lng: 139.7005 };
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAP_ID as string | undefined) || "DEMO_MAP_ID";

const emptyDraft = (): StoreDraft => ({ name: "", genre: "その他" });

export function MapScreen({ onResetKey }: { onResetKey: () => void }) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [stores, setStores] = useState<Store[]>(loadStores);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [onlyWithVideos, setOnlyWithVideos] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoreDraft | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);

  useEffect(() => saveStores(stores), [stores]);

  const visibleStores = useMemo(
    () =>
      stores.filter(
        (s) =>
          (!genre || s.genre === genre) &&
          (!onlyWithVideos || s.videos.length > 0) &&
          (!query || s.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [stores, genre, onlyWithVideos, query],
  );

  const selected = stores.find((s) => s.id === selectedId) ?? null;

  const updateStore = (id: string, update: (s: Store) => Store) =>
    setStores((prev) => prev.map((s) => (s.id === id ? update(s) : s)));

  const openStore = (store: Store) => {
    setSelectedId(store.id);
    map?.panTo({ lat: store.lat, lng: store.lng });
  };

  /** Google マップ上のお店（POI）をタップしたら、登録済みなら開き、未登録なら追加画面を出す */
  const openPlace = async (placeId: string) => {
    const existing = stores.find((s) => s.placeId === placeId);
    if (existing) return openStore(existing);
    if (!placesLib) return;
    const place = new placesLib.Place({ id: placeId, requestedLanguage: "ja" });
    try {
      await place.fetchFields({ fields: ["displayName", "location", "formattedAddress", "primaryType"] });
    } catch {
      return;
    }
    if (!place.location) return;
    setDraft({
      name: place.displayName ?? "",
      genre: guessGenre(place.primaryType),
      lat: place.location.lat(),
      lng: place.location.lng(),
      address: place.formattedAddress ?? undefined,
      placeId,
    });
  };

  const onMapClick = (e: MapMouseEvent) => {
    const { placeId, latLng } = e.detail;
    if (placeId) {
      e.stop(); // Google 標準の吹き出しを出さない
      openPlace(placeId);
    } else if (pickMode && latLng) {
      setPickMode(false);
      setDraft({ ...(draft ?? emptyDraft()), ...latLng });
    }
  };

  const onLongPress = (e: MapMouseEvent) => {
    const { latLng } = e.detail;
    if (latLng) setDraft({ ...emptyDraft(), ...latLng });
  };

  const addStore = () => {
    if (!draft || draft.lat == null || draft.lng == null) return;
    const store: Store = { ...draft, id: `${Date.now()}`, name: draft.name.trim(), lat: draft.lat, lng: draft.lng, videos: [] };
    setStores((prev) => [...prev, store]);
    setDraft(null);
    openStore(store);
  };

  // 地図の読み込みに失敗している（キーが無効など）と getCenter が例外を投げるので守る
  const currentCenter = () => {
    try {
      return map?.getCenter()?.toJSON();
    } catch {
      return undefined;
    }
  };

  const goToCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setMyLocation(pos);
        map?.panTo(pos);
        map?.setZoom(16);
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
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons
        onClick={onMapClick}
        onContextmenu={onLongPress}
      >
        {visibleStores.map((s) => (
          <AdvancedMarker key={s.id} position={{ lat: s.lat, lng: s.lng }} onClick={() => openStore(s)} zIndex={s.videos.length}>
            <div className={`pin ${s.videos.length > 0 ? "hot" : ""} ${s.id === selectedId ? "selected" : ""}`}>
              <span>{GENRE_EMOJI[s.genre]}</span>
              {s.videos.length > 0 && <span className="pin-count">▶︎{s.videos.length}</span>}
            </div>
          </AdvancedMarker>
        ))}
        {myLocation && (
          <AdvancedMarker position={myLocation} zIndex={-1}>
            <div className="my-location" />
          </AdvancedMarker>
        )}
      </Map>

      <div className="top">
        <div className="search-row">
          <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 登録したお店を検索" type="search" />
          <button className="icon-button" onClick={() => confirm("Google Maps の API キーを入力し直しますか？") && onResetKey()} aria-label="設定">
            ⚙︎
          </button>
        </div>
        {query && (
          <ul className="suggestions">
            {visibleStores.slice(0, 6).map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setQuery("");
                    openStore(s);
                  }}
                >
                  {GENRE_EMOJI[s.genre]} {s.name}
                  {s.videos.length > 0 && <span className="pin-count"> ▶︎{s.videos.length}</span>}
                </button>
              </li>
            ))}
            {visibleStores.length === 0 && <li className="suggestions-empty">見つかりません。右下の ＋ から追加できます</li>}
          </ul>
        )}
        <div className="chips">
          <button className={`chip ${onlyWithVideos ? "tiktok" : ""}`} onClick={() => setOnlyWithVideos((v) => !v)}>
            🎵 動画あり
          </button>
          {GENRES.map((g) => (
            <button key={g} className={`chip ${genre === g ? "active" : ""}`} onClick={() => setGenre(genre === g ? null : g)}>
              {GENRE_EMOJI[g]} {g}
            </button>
          ))}
        </div>
      </div>

      {pickMode ? (
        <div className="banner">
          追加したい場所をタップ
          <button className="text-button light" onClick={() => setPickMode(false)}>
            やめる
          </button>
        </div>
      ) : (
        <div className="hint">地図上のお店をタップしても追加できます</div>
      )}

      <div className="fabs">
        <button className="fab" onClick={goToCurrentLocation} aria-label="現在地">
          📍
        </button>
        <button className="fab add" onClick={() => setDraft(emptyDraft())} aria-label="お店を追加">
          ＋
        </button>
      </div>

      {selected && (
        <StoreSheet
          key={selected.id}
          store={selected}
          onClose={() => setSelectedId(null)}
          onAddVideo={(v: TikTokVideo) => updateStore(selected.id, (s) => ({ ...s, videos: [v, ...s.videos] }))}
          onRemoveVideo={(id) => updateStore(selected.id, (s) => ({ ...s, videos: s.videos.filter((v) => v.id !== id) }))}
          onDeleteStore={() => {
            setStores((prev) => prev.filter((s) => s.id !== selected.id));
            setSelectedId(null);
          }}
        />
      )}
      {draft && !pickMode && (
        <AddStoreSheet
          draft={draft}
          placesLib={placesLib}
          getCenter={currentCenter}
          onChange={setDraft}
          onPickOnMap={() => setPickMode(true)}
          onSubmit={addStore}
          onCancel={() => setDraft(null)}
        />
      )}
    </div>
  );
}
