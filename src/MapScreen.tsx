import { useRef, useState } from "react";
import { AdvancedMarker, Map, type MapEvent, type MapMouseEvent, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { fetchStores, fetchUsage, fetchVideos } from "./api";
import { StoreSheet } from "./StoreSheet";
import type { Place, PlaceResult, PlaceSummary } from "./types";

const SHIBUYA = { lat: 35.6595, lng: 139.7005 };
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAP_ID as string | undefined) || "DEMO_MAP_ID";
// 1 回の検索で動画を調べるお店の数（検索 API の無料枠を使いすぎないため）
const MAX_RESULTS = 10;
// 同時に調べるお店の数
const CONCURRENCY = 3;

type CheckState = "checking" | "error";

const shortAddress = (address: string) => address.replace(/^日本、\s*(〒\d{3}-\d{4}\s*)?/, "");

export function MapScreen() {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [summaries, setSummaries] = useState<Record<string, PlaceSummary>>({});
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [onlyWithVideos, setOnlyWithVideos] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const idleTimer = useRef<number | undefined>(undefined);
  const searchId = useRef(0);

  const resultIds = new Set(results?.map((r) => r.placeId));
  const markers = Object.values(summaries).filter((s) => !resultIds.has(s.placeId) && (!onlyWithVideos || s.count > 0));
  const countOf = (placeId: string) => summaries[placeId]?.count;

  const saveSummary = (r: PlaceResult) =>
    setSummaries((prev) => ({ ...prev, [r.placeId]: { placeId: r.placeId, name: r.name, lat: r.lat, lng: r.lng, count: r.videos.length } }));

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
    const fromResults = results?.find((r) => r.placeId === placeId);
    if (fromResults) return open(fromResults);
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

  /** 検索結果のお店の動画を、何軒かずつ順番に調べて地図に反映する */
  const checkVideos = async (places: Place[], id: number) => {
    const queue = places.filter((p) => countOf(p.placeId) === undefined);
    setChecks((prev) => ({ ...prev, ...Object.fromEntries(queue.map((p) => [p.placeId, "checking" as const])) }));
    const worker = async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        if (id !== searchId.current) return; // 新しい検索が始まったら止める
        const place = p;
        try {
          saveSummary(await fetchVideos(place));
          setChecks((prev) => {
            const next = { ...prev };
            delete next[place.placeId];
            return next;
          });
        } catch (e) {
          setChecks((prev) => ({ ...prev, [place.placeId]: "error" }));
          // 今月の無料枠を使い切ったら、残りのお店は調べない
          if (e instanceof Error && e.message.includes("無料枠") && id === searchId.current) {
            searchId.current++;
            alert(e.message);
            return;
          }
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  };

  /** 「居酒屋」「カフェ」「一蘭」などで、今見ているエリアのお店を探す */
  const search = async () => {
    if (!placesLib || !query.trim()) return;
    const id = ++searchId.current;
    setSearching(true);
    setResults(null);
    setListOpen(true);
    try {
      let bounds: google.maps.LatLngBoundsLiteral | undefined;
      try {
        bounds = map?.getBounds()?.toJSON();
      } catch {
        // 地図の読み込みに失敗していても検索はできる
      }
      const { places } = await placesLib.Place.searchByText({
        textQuery: query,
        fields: ["id", "displayName", "location", "formattedAddress"],
        // 表示中のエリアを優先する（エリア名を含む検索ならそちらが優先される）
        locationBias: bounds,
        maxResultCount: MAX_RESULTS,
        language: "ja",
        region: "jp",
      });
      if (id !== searchId.current) return;
      const found = places.map(toPlace).filter((p): p is Place => !!p);
      setResults(found);
      if (found.length > 0 && map) {
        const fit = new google.maps.LatLngBounds();
        found.forEach((p) => fit.extend(p));
        map.fitBounds(fit, { top: 140, bottom: 260, left: 40, right: 40 });
        if (found.length === 1) map.setZoom(17);
      }
      checkVideos(found, id);
    } catch {
      alert("検索できませんでした。Google Cloud で「Places API (New)」が有効か確認してください");
    } finally {
      if (id === searchId.current) setSearching(false);
    }
  };

  const clearSearch = () => {
    searchId.current++;
    setQuery("");
    setResults(null);
    setSearching(false);
  };

  const showUsage = async () => {
    const usage = await fetchUsage();
    if (!usage) return alert("利用状況を取得できませんでした");
    const left = usage.limit - usage.used;
    alert(
      `今月のTikTok動画検索：${usage.used} / ${usage.limit} 回（あと ${left} 回）\n\n` +
        "無料枠を超えないよう、上限に達すると来月まで新しいお店は調べません。調べ済みのお店の動画はいつでも見られます。\n\n" +
        "※1軒調べるのに1〜2回使います",
    );
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

  // 検索結果：動画が多い順 → 調べ中 → 動画なし
  const sortedResults = (results ?? [])
    .map((p) => ({ place: p, count: countOf(p.placeId), state: checks[p.placeId] }))
    .filter((r) => !onlyWithVideos || r.count === undefined || r.count > 0)
    .sort((a, b) => (b.count ?? -0.5) - (a.count ?? -0.5));
  const checkingCount = results?.filter((p) => checks[p.placeId] === "checking").length ?? 0;
  const withVideos = results?.filter((p) => (countOf(p.placeId) ?? 0) > 0).length ?? 0;

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
        {sortedResults.map(({ place, count, state }) => (
          <AdvancedMarker key={place.placeId} position={place} onClick={() => open(place)} zIndex={1000 + (count ?? 0)}>
            <div className={`pin result ${count ? "hot" : ""} ${place.placeId === selected?.placeId ? "selected" : ""}`}>
              {count === undefined ? (
                state === "checking" ? <span className="spinner small" /> : <span>?</span>
              ) : count > 0 ? (
                <span className="pin-count">▶︎{count}</span>
              ) : (
                <span className="pin-zero">なし</span>
              )}
              <span className="pin-name">{place.name}</span>
            </div>
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
            (document.activeElement as HTMLElement | null)?.blur(); // キーボードを閉じる
            search();
          }}
        >
          <input
            className="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) clearSearch();
            }}
            placeholder="🔍 居酒屋・カフェ・店名で検索"
            type="search"
            enterKeyHint="search"
          />
          <button type="button" className="icon-button" onClick={showUsage} aria-label="利用状況">
            ⚙︎
          </button>
        </form>
        <div className="chips">
          <button className={`chip ${onlyWithVideos ? "tiktok" : ""}`} onClick={() => setOnlyWithVideos((v) => !v)}>
            🎵 動画ありだけ
          </button>
          <span className="legend">
            <span className="pin hot mini">▶︎3</span> 動画あり <span className="pin-none" /> 動画なし
          </span>
        </div>
      </div>

      {(results || searching) && (
        <div className={`results-panel ${listOpen ? "" : "collapsed"}`}>
          <button className="results-head" onClick={() => setListOpen((v) => !v)}>
            <span>
              {searching
                ? "お店を探しています…"
                : `「${query}」${results?.length ?? 0}件 ・ 動画あり ${withVideos}件${checkingCount ? `（${checkingCount}件 調べ中）` : ""}`}
            </span>
            <span className="results-toggle">{listOpen ? "▼" : "▲"}</span>
          </button>
          {listOpen && (
            <ul className="results-list">
              {results?.length === 0 && <li className="suggestions-empty">このあたりでは見つかりませんでした。地図を動かしてもう一度検索してください</li>}
              {sortedResults.map(({ place, count, state }) => (
                <li key={place.placeId}>
                  <button onClick={() => open(place)}>
                    <span className="result-text">
                      <strong>{place.name}</strong>
                      <span className="suggestion-sub">{shortAddress(place.address)}</span>
                    </span>
                    <span className={`result-badge ${count ? "hot" : ""}`}>
                      {count === undefined ? (state === "error" ? "失敗" : "調べ中…") : count > 0 ? `▶︎${count}本` : "動画なし"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="results-clear" onClick={clearSearch}>
            検索をやめる
          </button>
        </div>
      )}

      {!results && !searching && <div className="hint">お店をタップするとTikTok動画を探します</div>}

      <div className={`fabs ${results || searching ? "raised" : ""}`}>
        <button className="fab" onClick={goToCurrentLocation} aria-label="現在地">
          📍
        </button>
      </div>

      {selected && (
        <StoreSheet key={selected.placeId} place={selected} onClose={() => setSelected(null)} onLoaded={saveSummary} />
      )}
    </div>
  );
}
