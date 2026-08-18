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
  videos.json        チャンネルの投稿動画一覧(id + タイトル)のスナップショット
  master.js          Wiki の全スキン一覧(コレクション/ベース/アップグレード/ヴァリアント)
  match.js           videos.json と master.js を突き合わせるロジック
  build.js           突き合わせを実行して assets/data.json を書き出す
```

## データの更新方法

チャンネルに新しい動画を投稿したら:

1. `scripts/videos.json` を最新の動画一覧(`{ contentId, title }` の配列)に差し替える
2. Wiki 側に新しいコレクションが追加されていれば `scripts/master.js` に行を追加する
3. 以下を実行してサイトのデータを再生成する

```bash
node scripts/build.js
```

`assets/data.json` が更新されるので、そのままコミット・デプロイすればOKです。

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
