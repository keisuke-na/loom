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
[Stage 2: LLM] DSL(本文のみ) → セマンティックDSL（意味づけ: .as, .tag, .repeat）
    ↓
[Stage 2.5: プログラム] セマンティックDSL + 変数定義 → コンポーネント化されたReactコード
    ※ .repeat 付きの兄弟ノードを diff → props 抽出 → data 配列 + map() 生成
```

## 進捗
- Stage 1: 完了（React コード生成）
- Stage 1.5: 完了（DSL 生成 + 変数自動抽出 + パススルーノード平坦化）
- Stage 2: 完了（LLM による意味づけ、プロンプト作成済み）
  - LLM の仕事は .as(), .tag(), .repeat() の3つ
- Stage 2.5: 完了（セマンティック DSL → React コンポーネント生成、repeat diff + props 抽出）
- 次のステップ: MCP サーバー化（後述）

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
│   └── node.ts               # ノード → CSS 統合 (collectStyles, resolveTag, flattenPassthroughNodes)
├── parser/
│   └── dsl-parser.ts         # セマンティック DSL パーサー + void要素バリデーション
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
└── dsl-to-semantic.md        # DSL → セマンティック DSL 用 LLM プロンプト（.as, .tag, .repeat）

dsl-spec.md                   # DSL 仕様書 (v0.3)
image-cache.json              # Figma 画像 URL キャッシュ
```

## 重要な設計判断
- Stage 1 の transformer は CSS プロパティを出力 → DSL ジェネレーターが CSS → DSL マッピングで変換（ロジック共有）
- 主軸/交差軸の判定: parentLayoutMode を子に渡して FILL → flex:1 or align-self:stretch を切り分け
- VECTOR ノード: layoutMode なしのフレーム内の単一 VECTOR は img に平坦化、サイズは absoluteRenderBounds を使用
- IMAGE fill ノード: fills に type:"IMAGE" を持つノードも画像として扱う
- パススルーノード: 子が1つで視覚的スタイルを持たないフレームを除去し、レイアウトプロパティを子に移植
- DSL の padding は 1:1 対応（.pt, .pr, .pb, .pl）にして LLM の変換精度を確保
- 画像 URL は $img 変数にゼロパディング付き（$img01, $img02...）で抽出してハルシネーション防止
- Stage 2 の LLM には変数定義を渡さず本文のみ（トークン削減 + ハルシネーション防止）
- LLM の仕事は .as()（コンポーネント宣言）、.tag()（セマンティックHTML）、.repeat(N)（繰り返しマーク）の3つ
- .repeat(N) は LLM がマーク、プログラムが兄弟 diff → props 抽出 → data 配列 + map() 生成（役割分離）
- .as() は「コンポーネント化」の意味のみ。ラベル用途との曖昧さを排除
- .as() が付いた全 F ノードをコンポーネント化（粒度の判断は LLM に委ねる）
- void 要素（img, br 等）が子を持つ場合は .tag() をバリデーションで除去
- .hugW / .hugH で width/height: fit-content を表現（.hug を分離して情報欠落を防止）
- パススルーノード平坦化: FIXED サイズのノードは平坦化しない（サイズ情報の欠落防止）

## LLM 利用時の知見
- Gemini Flash: 高速・安価だが、構造的な判断（@repeat の配置、void 要素の扱い）が不安定
- Gemini Pro: 品質は高いが、仕様にない記法を発明する傾向がある
- 変数名のゼロパディング ($img01 vs $img1) でハルシネーションを軽減できる
- プロンプトに具体的な正誤例を含めると精度が向上する
- LLM の仕事を絞るほど出力が安定する

## トークン削減効果
- Figma JSON: 73,528 トークン
- LLM 入力（プロンプト + body DSL）: 2,533 トークン
- 削減率: 96.6%（約 29分の1）

## MCP サーバー化（次のステップ）
パイプラインを MCP サーバーとして公開し、Claude Code 等の MCP クライアントから直接利用可能にする。

### 動機
- Figma MCP はデザイン JSON をそのまま LLM に渡すためトークン消費が膨大（73,528 トークン）
- Loom は DSL 圧縮で 96.6% 削減（2,533 トークン）

### 想定ツール
- `generate-dsl`: Figma URL/JSON → DSL 本文を返す（Stage 1.5）
- `generate-react`: セマンティック DSL + vars → React コードを返す（Stage 2.5）

### フロー
1. MCP クライアントが `generate-dsl` を呼ぶ → DSL 本文を受け取る
2. MCP クライアント（LLM）自身が DSL にセマンティック付与（Stage 2）
3. MCP クライアントが `generate-react` を呼ぶ → React コードを受け取る
4. MCP クライアントが Tailwind 変換やファイル配置を行う

### 技術
- `@modelcontextprotocol/sdk` (TypeScript)
- 既存の CLI 機能をツールとしてラップ

## サンプルデータ
- ~/Downloads/components.json — Figma REST API のレスポンス (FILE_KEY: WHwlnNVOUNMCdAto8Md7K1)
- image-cache.json — 15 画像の URL キャッシュ
