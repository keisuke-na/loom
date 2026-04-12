# Loom - Figma → Code 変換ツール

## 概要
Figma REST APIから取得したデザインJSON を、ハイブリッドアプローチ（プログラム＋LLM）でReactコードに変換するCLIツール。

## アーキテクチャ
```
Figma REST API (JSON)
    ↓
[Stage 1: プログラム] JSON → ピクセルパーフェクトReactコード
    ↓
[Stage 1.5: プログラム] JSON → loom DSL（コンパクトなUI記法、98%トークン削減）
    ↓
[Stage 2: LLM] DSL(本文のみ) → セマンティックDSL（意味づけのみ: .as, .tag, @repeat, @prop, @data）
    ↓
[Stage 2.5: プログラム] セマンティックDSL + 変数定義 → コンポーネント化されたReactコード
```

## 進捗
- Stage 1: 完了（React コード生成）
- Stage 1.5: 完了（DSL 生成 + 変数自動抽出）
- Stage 2: 完了（LLM による意味づけ、プロンプト作成済み）
- Stage 2.5: 完了（セマンティック DSL → React コンポーネント生成、プレビュー確認済み）

## 技術スタック
- TypeScript + Node.js 22
- pnpm (mise で管理)
- 外部ライブラリなし（Node.js 標準の fetch のみ）

## コマンド
```bash
# ビルド
pnpm build

# React コード生成（Stage 1）
node dist/index.js <input.json> [--image-cache=cache.json] [--file-key=FILE_KEY]

# DSL 生成（Stage 1.5）
node dist/index.js <input.json> --format=dsl [--image-cache=cache.json]

# DSL 本文のみ生成（Stage 2 の LLM 入力用）
node dist/index.js <input.json> --format=dsl --body-only [--image-cache=cache.json]

# セマンティック DSL → React コード生成（Stage 2.5）
node dist/index.js <semantic.dsl> --format=semantic-react --vars=<vars.dsl>

# Stage 1 プレビュー HTML 生成
npx tsx scripts/preview.ts <input.json> [--image-cache=cache.json] > output.html

# Stage 2.5 プレビュー HTML 生成
npx tsx scripts/preview-semantic.ts <generated.tsx> > output.html
```

## ファイル構成
```
src/
├── api/figma-client.ts       # Figma REST API クライアント + 画像ノード収集
├── transformers/
│   ├── layout.ts             # Auto Layout → flexbox CSS
│   ├── visual.ts             # fills/strokes → CSS (TEXT は color, それ以外は background-color)
│   ├── text.ts               # typography → CSS
│   └── node.ts               # ノード → CSS 統合 (collectStyles, resolveTag)
├── parser/
│   └── dsl-parser.ts         # セマンティック DSL パーサー
├── generator/
│   ├── react-generator.ts    # ツリー → React コード (Stage 1)
│   ├── dsl-generator.ts      # ツリー → DSL + 変数自動抽出 (Stage 1.5)
│   └── semantic-react-generator.ts  # セマンティック DSL → React コンポーネント (Stage 2.5)
└── index.ts                  # CLI エントリーポイント

scripts/
├── preview.ts                # Stage 1 React CDN ベースの HTML プレビュー
└── preview-semantic.ts       # Stage 2.5 React CDN ベースの HTML プレビュー

prompts/
├── dsl-to-html.md            # DSL → HTML 変換用 LLM プロンプト
└── dsl-to-semantic.md        # DSL → セマンティック DSL 用 LLM プロンプト

dsl-spec.md                   # DSL 仕様書 (v0.3)
image-cache.json              # Figma 画像 URL キャッシュ
```

## 重要な設計判断
- Stage 1 の transformer は CSS プロパティを出力 → DSL ジェネレーターが CSS → DSL マッピングで変換（ロジック共有）
- 主軸/交差軸の判定: parentLayoutMode を子に渡して FILL → flex:1 or align-self:stretch を切り分け
- VECTOR ノード: layoutMode なしのフレーム内の単一 VECTOR は img に平坦化、サイズは absoluteRenderBounds を使用
- IMAGE fill ノード: fills に type:"IMAGE" を持つノードも画像として扱う
- DSL の padding は 1:1 対応（.pt, .pr, .pb, .pl）にして LLM の変換精度を確保
- 画像 URL は $img 変数に抽出してハルシネーション防止
- Stage 2 の LLM には変数定義を渡さず本文のみ（トークン削減 + ハルシネーション防止）
- セマンティック DSL: LLM は意味づけ（.as, .tag, @repeat, @prop, @data）のみ担当
- .as() が付いた全要素をコンポーネント化（粒度の判断は LLM のプロンプトで調整）
- @repeat 内はテンプレート + @data でデータ分離し、プログラムで map() + props に変換

## サンプルデータ
- ~/Downloads/components.json — Figma REST API のレスポンス (FILE_KEY: WHwlnNVOUNMCdAto8Md7K1)
- image-cache.json — 15 画像の URL キャッシュ
