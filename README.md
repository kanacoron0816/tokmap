# TokMap — TikTok動画で探すお店マップ（Webアプリ / PWA）

Googleマップ上のお店をタップすると、そのお店に紐付いたTikTok動画を縦スワイプで見られるWebアプリです。
iPhoneのSafariで開いて「ホーム画面に追加」すると、普通のアプリのように全画面で使えます（App Store・Mac・Apple Developer登録はいりません）。

## できること
- Googleマップ上のお店をタップすると、**アプリが自動でTikTok動画を検索して紐付け**ます
  - 店名と住所から「店名」「地名（区・町・支店名）」を取り出し、動画のキャプションとハッシュタグに**両方**入っている動画だけを、そのお店の動画として表示します
  - 店名だけ一致した動画（チェーン店の別の店舗など）は「別の店舗の可能性あり」として分けて表示します
- 一度検索したお店は結果がサーバーに保存され、**地図に「▶︎本数」（動画あり）／灰色の点（動画なし）**で表示されます。全員で共有されます
- 店名・エリアで検索、「動画ありだけ」の絞り込み、現在地へ移動
- TikTok風の縦スワイプ動画プレイヤー（TikTok公式の埋め込みプレイヤーを使用）

## 1. Google Maps の API キーを用意する
1. [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/start) でプロジェクトを作成（請求先アカウントの登録が必要ですが、毎月の無料枠内なら料金はかかりません）
2. **Maps JavaScript API** と **Places API (New)** を有効化
3. 「認証情報」→ API キーを作成
4. キーの制限 →「ウェブサイト」で公開URL（例：`https://あなたのアプリ.vercel.app/*`）だけを許可（他人に悪用されないようにするため）

## 2. 公開する（おすすめ：Vercel・無料）
1. このフォルダを GitHub のリポジトリにアップロード
2. [vercel.com](https://vercel.com) に GitHub でログイン →「Add New → Project」→ リポジトリを選ぶ
3. Environment Variables に `VITE_GOOGLE_MAPS_API_KEY` = 発行したキー を追加して Deploy
4. 発行された URL を iPhone の Safari で開き、共有ボタン →「ホーム画面に追加」

## 3. 動画の自動検索をオンにする
1. [Brave Search API](https://brave.com/search/api/) に登録して API キーを発行し、Vercel の Environment Variables に `BRAVE_SEARCH_API_KEY` として追加
2. Vercel のプロジェクト →「Storage」→「Upstash for Redis」を作成してプロジェクトにつなぐ（検索結果の保存・共有用。無料枠あり）
3. Environment Variables に `APP_PASSCODE`（合言葉）を追加。合言葉を知っている人しか使えなくなり、検索や地図の無料枠を他人に使われません（未設定の間は検索が止まります）
4. 「Deployments」から最新のものを「Redeploy」

動画は Brave の検索結果に載っている TikTok 動画から探します（TikTok には外部アプリ向けの公式検索 API がないため）。

> 環境変数を設定しない場合は、アプリの初回画面でキーを入力して使うこともできます。ただしiPhoneでは Safari とホーム画面のアプリで保存場所が別なので、ホーム画面から開いたときにもう一度入力が必要です。

## 手元で動かす
```bash
npm install
cp .env.example .env   # VITE_GOOGLE_MAPS_API_KEY を記入（空でも画面から入力可）
npm run dev
```

## ファイル構成
| ファイル | 役割 |
|---|---|
| `src/MapScreen.tsx` | 地図画面（動画の有無のピン、検索、絞り込み） |
| `src/StoreSheet.tsx` | お店の詳細と、自動で見つけた動画の一覧 |
| `src/VideoFeed.tsx` | 縦スワイプの動画プレイヤー |
| `api/videos.ts` | お店の動画を検索して保存する |
| `api/stores.ts` | 地図の範囲にある検索済みのお店を返す |
| `api/_lib/match.ts` | キャプション・ハッシュタグとお店の照合ルール |
| `api/_lib/search.ts` | Brave Search と TikTok oEmbed で動画を集める |

## 次のステップ
1. 表示中のエリアのお店をまとめて検索して、最初から地図に動画の有無を出す
2. 「近くでバズってる店」フィード、お気に入り・行きたいリスト

> 動画は TikTok 公式の埋め込みプレイヤーで再生しています（動画ファイルの保存・再配信はしていません）。一般公開する前に TikTok と Google Maps Platform の利用規約を確認してください。
