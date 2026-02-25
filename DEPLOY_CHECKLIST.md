# Deploy Checklist (GitHub Pages)

## 1. 事前準備
- [ ] `main` ブランチに最新変更を push 済み
- [ ] ローカルで `npm run build` が成功している
- [ ] `.github/workflows/pages.yml` が存在している

## 2. リポジトリ設定
- [ ] GitHub の `Settings` → `Pages` を開く
- [ ] `Source` を `GitHub Actions` に設定
- [ ] `Actions` タブで `Deploy GitHub Pages` が実行されることを確認

## 3. 公開URL確認
- [ ] 公開URLにアクセスしてトップ画面が表示される
- [ ] 難易度フィルタと出題数選択でクイズ開始できる
- [ ] 回答→次の問題→結果表示まで遷移できる
- [ ] 振り返り一覧（問題/回答/正答/解説/リンク）が表示される

## 4. リンク・静的ファイル確認
- [ ] CSS が適用されている
- [ ] `main.js` の読み込みエラーがない
- [ ] `question-data.js` の読み込みエラーがない
- [ ] 出典リンクが開ける

## 5. 404確認
- [ ] 存在しないURLへアクセスして `404.html` が表示される
- [ ] 404ページからトップへ戻れる

## 6. 障害時の切り分け
- [ ] `Actions` の失敗ログを確認
- [ ] `npm run validate:questions` を再実行
- [ ] `npm run report:questions` で欠損項目を確認
- [ ] 修正後に再pushして再デプロイ
