# TokMap — TikTok動画で探すお店マップ（Webアプリ / PWA）

Googleマップ上のお店をタップすると、そのお店に紐付いたTikTok動画を縦スワイプで見られるWebアプリです。
iPhoneのSafariで開いて「ホーム画面に追加」すると、普通のアプリのように全画面で使えます（App Store・Mac・Apple Developer登録はいりません）。

## できること
- Googleマップにお店をピン表示（動画のあるお店は赤枠＋本数バッジ）
- **Googleマップ上のお店をタップ → そのままTokMapに登録**（店名・住所・ジャンルを自動入力）
- ＋ボタンから店名で検索して登録（Places API）／地図をタップして場所を指定
- お店の詳細 →「TikTokで探す」→ 動画のリンクをコピー → 貼り付けで紐付け
- TikTok風の縦スワイプ動画プレイヤー（TikTok公式の埋め込みプレイヤーを使用）
- 「動画あり」・ジャンルでの絞り込み、登録したお店の検索、現在地へ移動
- データはその端末のブラウザに保存されます

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

Vercel では `api/tiktok.ts` がサーバー側で動き、TikTok の短縮URL（`vm.tiktok.com/…`）の展開とサムネイル取得を行います。
GitHub Pages など他の静的ホスティングでも動きますが、短縮URLは一度ブラウザで開いて `…/video/数字` のURLをコピーする必要があります。

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
| `src/MapScreen.tsx` | 地図画面（ピン、検索、絞り込み、Googleマップのお店タップで登録） |
| `src/StoreSheet.tsx` | お店の詳細、動画一覧、TikTok URL の紐付け |
| `src/VideoFeed.tsx` | 縦スワイプの動画プレイヤー |
| `src/AddStoreSheet.tsx` | お店の追加（店名検索 / 地図で場所指定） |
| `src/tiktok.ts` / `api/tiktok.ts` | TikTok URL の解析・動画情報の取得 |
| `src/storage.ts` | 端末への保存、サンプルデータ |

## 次のステップ
1. **みんなで共有**：Supabase などにデータを保存し、全員の登録が地図に集まるようにする（＋ログイン）
2. **紐付けの自動提案**：動画のタイトルやハッシュタグに含まれる店名を Places API で照合
3. 「近くでバズってる店」フィード、お気に入り・行きたいリスト

> 動画は TikTok 公式の埋め込みプレイヤーで再生しています（動画ファイルの保存・再配信はしていません）。一般公開する前に TikTok と Google Maps Platform の利用規約を確認してください。
