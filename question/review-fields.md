# Review Fields

クイズ終了後の振り返り表示に必要な項目定義です。

## 必須項目
- `questionId`: 問題ID
- `selectedChoiceId`: ユーザが選んだ選択肢ID
- `correctChoiceId`: 正答の選択肢ID
- `isCorrect`: 正誤（true/false）

## 画面表示で参照する関連情報（問題データから取得）
- `question`
- `choices`
- `explanation`
- `sources`
- `difficulty`

## 実装上の対応
- 上記必須項目は `src/main.ts` の `AnswerRecord` で保持。
- 振り返り画面では `AnswerRecord` と問題データを結合して表示する。
