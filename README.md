# Rust言語検定
Rust言語の学習向け検定クイズツール

## 概要
このプロジェクトではRust言語の学習用にRust言語に関するクイズを出すツールを作成します。

## クイズの形式
- 選択式のクイズ
- 解説が必要な場合には回答の他に解説を補足します。
- クイズの出典や補足となるリンクも補足します。


## 問題
以下のサイトから出題します。(都度追加します。)

- https://doc.rust-jp.rs/book-ja/
  - github: https://github.com/rust-lang-ja/book-ja
- https://www.lurklurk.org/effective-rust/
  - github: https://github.com/dx13/effective-rust
- https://rust-lang.github.io/async-book/
  - github: https://github.com/rust-lang/async-book

## 出題仕様

- クイズそれぞれに難易度が設定されており、難易度をフィルタすることが可能です。
- 連続で出題する数を5,10,30,50,100から選ぶことができます。
- 終了後に正答率を表示します
- 終了後に問題を振り返ることができます
- クイズの言語は日本語です

## 公開方法
- github pagesを使って公開します
  - よって言語はtypescript+html+cssで作成します 
- ユーザ認証は不要です。
- Actionsで公開する設定を採用します（`.github/workflows/pages.yml`）。

## 非機能要件

- クイズの表示をサクサク行えるように工夫してください
- コードを貼る場合はエディタのように文字色やバックグラウンドカラーを入れてください

## 問題データ構成

- 問題は1問ごとに `question/items/<category>/<id>.json` へ配置します。
- 問題一覧は `question/index.json` で管理します（`npm run sync:index` で自動更新）。
- 難易度は `beginner` / `intermediate` / `advanced` を使用します。
- 難易度の判定基準は `question/difficulty-guidelines.md` を参照します。
- 出題範囲（章単位）は `question/syllabus.md` を参照します。
- 品質基準は `question/quality-criteria.md` を参照します。

## ローカル実行方法

1. 依存関係をインストール

```bash
npm install
```

2. ビルド（GitHub Pages公開用の `docs/` を生成）

```bash
npm run build
```

※ `build` 実行時に `question/items` から `question/index.json` を自動同期します。
※ `build` 実行時に問題データのバリデーション（`npm run validate:questions`）も行います。

3. ローカル確認（`http://localhost:4173`）

```bash
npm run dev
```

## GitHub Pages 公開手順

1. リポジトリの `Settings` → `Pages` を開く
2. `Build and deployment` の `Source` を `GitHub Actions` に設定
3. `main` へpushすると `Deploy GitHub Pages` ワークフローが実行される
4. 公開URLで表示確認する（問題遷移、リンク、結果画面、404）

公開確認の詳細は `DEPLOY_CHECKLIST.md` を参照してください。

### 補足

- Finderで開く場合は、プロジェクトルートの `index.html` を開いてください。
- 問題データだけ検証したい場合は `npm run validate:questions` を実行してください。
- 出典リンク品質だけ検証したい場合は `npm run validate:sources` を実行してください。
- 問題品質レポートを出す場合は `npm run report:questions` を実行してください（`reports/question-report.md` を生成）。

## 問題追加フロー

1. ひな形ファイルを作成

```bash
npm run new:question -- --id q0106 --category-dir ownership
```

2. 生成された `question/items/<category>/<id>.json` を編集

3. インデックス同期と検証

```bash
npm run sync:index
npm run validate:questions
```

運用全体の手順は `OPERATIONS.md`、既知課題は `KNOWN_ISSUES.md` を参照してください。