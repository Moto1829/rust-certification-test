# Question Quality Criteria

問題品質チェックの基準です。`npm run validate:questions` と `npm run report:questions` を前提に運用します。

## 正確性
- 正答が出典と矛盾しない
- 誤答選択肢が明確に誤りと判断できる

## 曖昧性
- 問題文に複数解釈が生じない
- 条件（前提）が不足していない

## 難易度
- `beginner` / `intermediate` / `advanced` の定義に沿っている
- 同一タグ内で段階的に難易度が分散している

## データ品質
- `sources` が空でない（validateで検出）
- `explanation` が空でない（reportで検出）
- `tags` が空でない（reportで検出）
- `question/index.json` と `question/items` が一致（validateで検出）

## 運用チェック
- 追加・更新後に以下を実行
  - `npm run sync:index`
  - `npm run validate:questions`
  - `npm run report:questions`
