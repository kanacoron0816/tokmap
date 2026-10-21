import { useState } from "react";
import { GENRE_EMOJI, GENRES, guessGenre, type StoreDraft } from "./types";

type Props = {
  draft: StoreDraft;
  placesLib: google.maps.PlacesLibrary | null;
  getCenter: () => google.maps.LatLngLiteral | undefined;
  onChange: (draft: StoreDraft) => void;
  onPickOnMap: () => void;
  onSubmit: () => void;
  onCancel: () => void;
};

/** お店の追加：Google のお店を検索するか、地図をタップして場所を指定する */
export function AddStoreSheet({ draft, placesLib, getCenter, onChange, onPickOnMap, onSubmit, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<google.maps.places.Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const hasLocation = draft.lat != null && draft.lng != null;

  const search = async () => {
    if (!placesLib || !query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const { places } = await placesLib.Place.searchByText({
        textQuery: query,
        fields: ["id", "displayName", "location", "formattedAddress", "primaryType"],
        locationBias: getCenter(),
        maxResultCount: 8,
        language: "ja",
        region: "jp",
      });
      setResults(places);
      if (places.length === 0) setError("見つかりませんでした");
    } catch {
      setError("検索できませんでした。Google Cloud で「Places API (New)」が有効になっているか確認してください");
    } finally {
      setSearching(false);
    }
  };

  const choose = (p: google.maps.places.Place) => {
    if (!p.location) return;
    onChange({
      name: p.displayName ?? "",
      genre: guessGenre(p.primaryType),
      lat: p.location.lat(),
      lng: p.location.lng(),
      address: p.formattedAddress ?? undefined,
      placeId: p.id,
    });
    setResults([]);
  };

  return (
    <>
      <div className="backdrop" onClick={onCancel} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>お店を追加</h2>
          <button className="text-button" onClick={onCancel}>
            キャンセル
          </button>
        </div>

        {!hasLocation ? (
          <>
            <form
              className="input-row"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
            >
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="店名で検索（例：一蘭 渋谷）" autoFocus />
              <button className="primary" disabled={!query.trim() || searching}>
                {searching ? "…" : "検索"}
              </button>
            </form>
            {error && <p className="error">{error}</p>}
            <ul className="results">
              {results.map((p) => (
                <li key={p.id}>
                  <button onClick={() => choose(p)}>
                    <strong>{p.displayName}</strong>
                    <span>{p.formattedAddress}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="secondary wide" onClick={onPickOnMap}>
              📍 地図をタップして場所を指定する
            </button>
          </>
        ) : (
          <>
            <label className="label">お店の名前</label>
            <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="お店の名前" />
            {draft.address && <p className="sub">{draft.address}</p>}
            <label className="label">ジャンル</label>
            <div className="chips wrap">
              {GENRES.map((g) => (
                <button key={g} className={`chip ${draft.genre === g ? "active" : ""}`} onClick={() => onChange({ ...draft, genre: g })}>
                  {GENRE_EMOJI[g]} {g}
                </button>
              ))}
            </div>
            <button className="primary wide" disabled={!draft.name.trim()} onClick={onSubmit}>
              追加して動画を紐付ける
            </button>
          </>
        )}
      </div>
    </>
  );
}
