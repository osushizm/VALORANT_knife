# VALORANT_knife — Knife Archive Ledger

[@osushizm](https://www.youtube.com/@osushizm) が投稿している VALORANT ナイフ動画と、
[Valorant Fandom Wiki の Melee ページ](https://valorant.fandom.com/wiki/Melee)に載る全ナイフスキン(ストア + バトルパス)を
突き合わせて、投稿済み/未投稿を一覧できる静的サイトです。ビルド不要・素の HTML/CSS/JS。

## 構成

```
index.html          エントリーポイント
assets/
  styles.css         スタイル
  app.js             データ読み込み・描画・検索/フィルタ
  data.json          突き合わせ結果(生成物)
scripts/
  videos.json        チャンネルの投稿動画一覧(id・タイトル・再生数)のスナップショット
  fetch-videos.js    YouTube Data API から videos.json を再取得する
  master.js          Wiki の全スキン一覧(コレクション/ベース/アップグレード/ヴァリアント)
  tags.js            武器種・イベント・色タグの判定ロジック
  match.js           videos.json と master.js を突き合わせるロジック
  build.js           突き合わせ+タグ付けを実行して assets/data.json を書き出す
.github/workflows/
  update-data.yml    毎日 videos.json を再取得して data.json を自動コミットする GitHub Actions
```

## タグ絞り込み

一覧テーブルの上に「区分 / 武器種 / イベント / 色」のタグパネルがあり、クリックで複数選択(AND条件)して絞り込めます。タグは `scripts/tags.js` がスキン名・ヴァリアント色・コレクション名から自動的に付与しており、手動でのタグ付け作業は不要です。新しいコレクションを `master.js` に追加すれば、タグも自動で再生成されます。

## データの自動更新(再生数・新着動画)

`.github/workflows/update-data.yml` が毎日 JST 3:00 に自動実行され、YouTube Data API v3 から
最新の動画一覧・再生数を取得して `assets/data.json` を再生成し、変更があればそのままコミット・
プッシュします(`workflow_dispatch` なのでいつでも手動実行も可能)。

### セットアップ(初回のみ・要 Google アカウント作業)

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成(または既存のものを使用)
2. 「APIとサービス」→「ライブラリ」で **YouTube Data API v3** を有効化
3. 「認証情報」→「認証情報を作成」→「APIキー」で API キーを発行
   - 「キーを制限」で API 制限を「YouTube Data API v3」のみに絞ると安全
4. このリポジトリの **Settings → Secrets and variables → Actions → New repository secret** で
   - Name: `YOUTUBE_API_KEY`
   - Secret: 発行した API キー

   を登録

これで翌日以降、毎日自動的に再生数・新着動画が反映されます。Actions タブから手動実行(Run workflow)もできます。

無料枠(1日 10,000 unit)に対して1回の実行で使うのは十数 unit 程度なので、費用やクォータの心配はほぼ不要です。

### 手動での更新

API キーを使わず手元で更新したい場合:

```bash
YOUTUBE_API_KEY=xxxx node scripts/fetch-videos.js   # scripts/videos.json を再取得
node scripts/build.js                                # assets/data.json を再生成
```

Wiki 側に新しいコレクションが追加された場合は `scripts/master.js` に行を追加してから
`node scripts/build.js` を実行してください。

## マッチングの仕組み(概要)

- `master.js` の各スキンは「ベース / アップグレード(アニメーション・VFX等) / ヴァリアント」を1項目ずつ持つ
- 各項目について、動画タイトルに該当コレクション名 + 該当キーワード(色名・アップグレード種別など)が含まれているかを判定
- 一致した項目には実際の動画(YouTube ID)を紐づけ、サイト上でサムネイル付きリンクとして表示

日本語タイトルと英語 Wiki 表記の対応は `master.js` 内のエイリアス(`jp` / `jpOr` / 色名テーブル)で管理しています。新しい表記ゆれが見つかった場合はここに追記してください。

## Cloudflare Pages へのデプロイ

ビルドコマンド不要の静的サイトです。Cloudflare Pages のプロジェクト設定で:

- **Build command**: (空欄のまま)
- **Build output directory**: `/`

を指定するだけで、`index.html` がそのまま配信されます。
