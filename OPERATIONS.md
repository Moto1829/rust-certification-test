# Operations

## 問題追加フロー
1. `npm run new:question -- <id> <difficulty>`
2. `question/items/<id>.json` を編集
3. `npm run sync:index`
4. `npm run validate:questions`
5. `npm run report:questions`
6. `npm run build`

## 問題データ更新チェックリスト
- [ ] `id` とファイル名が一致している
- [ ] `sources` が設定されている
- [ ] `explanation` が記述されている
- [ ] `tags` が設定されている
- [ ] 難易度がガイドラインに一致している
- [ ] `report:questions` で偏りが極端でない

## 新しい出題元追加手順
1. README の「問題」セクションにURLを追加
2. `question/syllabus.md` に該当章/領域を追記
3. 出題元タグを問題へ付与
4. `report:questions` で分布を確認

## バージョン管理ルール
- 問題追加は原則1PRあたり10〜30問
- 問題修正PRは「内容修正」と「難易度調整」を分離する
- コミットメッセージ例
  - `questions: add async beginner set`
  - `questions: fix ownership explanations`
  - `docs: update syllabus and quality criteria`

## 公開運用
- GitHub Pages公開時は `DEPLOY_CHECKLIST.md` に沿って確認する
