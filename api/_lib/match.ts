// 動画のキャプション・ハッシュタグが「このお店の動画か」を判定する

/** 表記ゆれを吸収する（全角/半角・大文字/小文字・空白や記号・ハッシュタグの # を無視） */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s#＃・･\-‐−_.,，。、!！?？'"“”「」『』()（）【】[\]|｜/／~〜:：&＆@]/g, "");
}

// 単独では店名と判断しない一般的な言葉
const GENERIC_WORDS = new Set(
  [
    "らーめん", "ラーメン", "拉麺", "中華そば", "そば", "蕎麦", "うどん", "つけ麺", "焼肉", "焼き肉", "寿司", "鮨", "すし",
    "回転寿司", "カフェ", "cafe", "coffee", "コーヒー", "珈琲", "居酒屋", "酒場", "バー", "bar", "ビストロ", "bistro", "食堂",
    "レストラン", "restaurant", "ベーカリー", "bakery", "パン", "ステーキ", "焼鳥", "焼き鳥", "やきとり", "キッチン", "kitchen",
    "ダイニング", "dining", "the", "本店", "総本店", "東京", "japan", "tokyo", "ramen", "sushi", "izakaya", "yakiniku",
  ].map(normalize),
);

const BRANCH_RE = /(本店|支店|号店|店|\d+f|地下\d+階|\d+階)$/;

export type StoreKeywords = {
  /** 店名（支店名を除いた部分）。どれかがキャプションに含まれる必要がある */
  names: string[];
  /** 支店名・地名。どれかが含まれると「このお店」と確定できる */
  areas: string[];
};

/** Google の店名と住所から、照合に使うキーワードを作る */
export function storeKeywords(displayName: string, address = ""): StoreKeywords {
  // 括弧の中は支店名として扱う：「鳥貴族 (渋谷店)」
  const parens = [...displayName.matchAll(/[(（【[]([^)）】\]]+)[)）】\]]/g)].map((m) => m[1]);
  const base = displayName.replace(/[(（【[][^)）】\]]*[)）】\]]/g, " ");
  const tokens = base.split(/[\s　]+/).filter(Boolean);
  const addressNorm = normalize(address);

  const areaWords = addressAreas(address);
  const isArea = (t: string) => {
    const n = normalize(t);
    if (BRANCH_RE.test(n)) return true;
    if (n.length < 2) return false;
    // 「渋谷TSUTAYA」のように地名で始まる言葉も支店名とみなす
    return addressNorm.includes(n) || areaWords.some((a) => n.startsWith(a));
  };

  // 先頭から、支店名・地名が出てくるまでを店名とみなす
  const firstArea = tokens.findIndex((t, i) => i > 0 && isArea(t));
  const nameTokens = firstArea === -1 ? tokens : tokens.slice(0, firstArea);
  const branchTokens = [...(firstArea === -1 ? [] : tokens.slice(firstArea)), ...parens];

  const names = new Set<string>();
  const full = normalize(nameTokens.join(""));
  if (full.length >= 2) names.add(full);
  // 「スターバックス コーヒー」→「スターバックス」でも一致させる（一般的な言葉は除く）
  for (const t of nameTokens) {
    const n = normalize(t);
    // 「横浜家系ラーメン」のようにジャンル名で終わる言葉も、それだけでは店名と判断しない
    const generic = GENERIC_WORDS.has(n) || [...GENERIC_WORDS].some((g) => g.length >= 3 && n.endsWith(g));
    if (n.length >= 3 && !generic) names.add(n);
  }

  const areas = new Set<string>(areaWords);
  for (const t of branchTokens) {
    const n = normalize(t);
    const stripped = n.replace(BRANCH_RE, "");
    if (n.length >= 2) areas.add(n);
    if (stripped.length >= 2) areas.add(stripped);
  }

  // 「1F」のような階数だけの言葉は、どの動画にも出てきうるので地名に使わない
  const usefulAreas = [...areas].filter((a) => !names.has(a) && !/^(地下)?\d+(f|階)?(店)?$/.test(a));
  return { names: [...names], areas: usefulAreas };
}

/** 住所から地名を取り出す：「東京都渋谷区宇田川町13-11」→ 渋谷区, 渋谷, 宇田川町, 宇田川 */
function addressAreas(address: string): string[] {
  const a = address.normalize("NFKC").replace(/^日本、?\s*/, "").replace(/〒?\d{3}-?\d{4}\s*/, "");
  const m = a.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}?県)?\s*([^\d\s]+?[市区町村])([^\d\s]*?)(?=[\d一二三四五六七八九十]|丁目|$)/);
  if (!m) return [];
  const out: string[] = [];
  const add = (w?: string) => {
    if (!w) return;
    const n = normalize(w);
    if (n.length >= 2) out.push(n);
    const stripped = n.replace(/[市区町村]$/, "");
    if (stripped.length >= 2 && stripped !== n) out.push(stripped);
  };
  // 政令市の「横浜市中区」のような形は、区の部分も地名として使う
  for (const part of `${m[2]}${m[3]}`.split(/(?<=[市区])/)) add(part);
  return out;
}

export type MatchResult = "confirmed" | "name-only" | "none";

/**
 * confirmed : 店名 ＋ 支店名/地名 がキャプションやハッシュタグに含まれる → このお店の動画
 * name-only : 店名だけ一致（チェーン店の別の店舗などの可能性がある）
 */
export function matchVideo(caption: string, keywords: StoreKeywords): MatchResult {
  const text = normalize(caption);
  const hashtags = [...caption.normalize("NFKC").matchAll(/[#＃]([^\s#＃]+)/g)].map((m) => normalize(m[1]));

  const nameHit = keywords.names.some((name) =>
    // 2 文字以下の短い店名（例：一蘭）は、文章の途中にたまたま含まれる誤判定を避けるため、ハッシュタグの先頭で一致した場合だけ
    name.length <= 2 ? hashtags.some((h) => h.startsWith(name)) : text.includes(name),
  );
  if (!nameHit) return "none";

  const areaHit = keywords.areas.some((area) => text.includes(area));
  return areaHit ? "confirmed" : "name-only";
}
