# Loom - Figma to Code Converter

## Overview
A CLI tool and MCP server that converts Figma design JSON into React code using a hybrid approach (programmatic + LLM). A compact DSL intermediate representation achieves 96.6% token reduction compared to raw Figma JSON.

## Architecture
```
Figma REST API (JSON)
    |
[Stage 1: Program] JSON -> pixel-perfect React code
    |
[Stage 1.5: Program] JSON -> loom DSL (compact UI notation, 96.6% token reduction)
    |
[Stage 2: LLM] DSL (body only) -> semantic DSL (annotations: .as, .tag, .repeat)
    |
[Stage 2.5: Program] semantic DSL + variable definitions -> componentized React code
    * diff .repeat siblings -> extract props -> generate data array + map()
```

## Status
- Stage 1: Done (React code generation)
- Stage 1.5: Done (DSL generation + auto variable extraction + passthrough node flattening)
- Stage 2: Done (LLM semantic annotation, prompts ready)
  - LLM's job: .as(), .tag(), .repeat() only
- Stage 2.5: Done (semantic DSL -> React component generation, repeat diff + props extraction)
- MCP Server: Done (generate-dsl, generate-react, list-components, get-component)

## Tech Stack
- TypeScript + Node.js 22
- pnpm (managed via mise)
- `@modelcontextprotocol/sdk` + `zod` for MCP server
- No other external libraries (Node.js built-in fetch only)

## Commands
```bash
# Build
pnpm build

# React code generation (Stage 1)
node dist/index.js <input.json> [--file-key=FILE_KEY]

# DSL generation (Stage 1.5)
node dist/index.js <input.json> --format=dsl

# DSL body only (LLM input for Stage 2)
node dist/index.js <input.json> --format=dsl --body-only

# Semantic DSL -> React code generation (Stage 2.5)
node dist/index.js <semantic.dsl> --format=semantic-react --vars=<vars.dsl>

# Stage 1 preview HTML
npx tsx scripts/preview.ts <input.json> [--file-key=FILE_KEY] > output.html

# Stage 2.5 preview HTML
npx tsx scripts/preview-semantic.ts <generated.tsx> > output.html
```

## File Structure
```
src/
├── api/figma-client.ts       # Figma REST API client + image node collection
├── transformers/
│   ├── layout.ts             # Auto Layout -> flexbox CSS
│   ├── visual.ts             # fills/strokes -> CSS (TEXT uses color, others use background-color)
│   ├── text.ts               # typography -> CSS
│   └── node.ts               # node -> CSS integration (collectStyles, resolveTag, flattenPassthroughNodes)
├── parser/
│   └── dsl-parser.ts         # semantic DSL parser + void element validation
├── generator/
│   ├── react-generator.ts    # tree -> React code (Stage 1)
│   ├── dsl-generator.ts      # tree -> DSL + auto variable extraction (Stage 1.5)
│   └── semantic-react-generator.ts  # semantic DSL -> React components (Stage 2.5)
├── index.ts                  # CLI entry point
└── mcp-server.ts             # MCP server entry point

scripts/
├── preview.ts                # Stage 1 React CDN-based HTML preview
└── preview-semantic.ts       # Stage 2.5 React CDN-based HTML preview

prompts/
├── dsl-to-html.md            # DSL -> HTML conversion LLM prompt
└── dsl-to-semantic.md        # DSL -> semantic DSL LLM prompt (.as, .tag, .repeat)

dsl-spec.md                   # DSL specification (v0.3)
```

## Key Design Decisions
- Stage 1 transformers output CSS properties -> DSL generator maps CSS to DSL modifiers (shared logic)
- Main/cross axis: pass parentLayoutMode to children to determine FILL -> flex:1 vs align-self:stretch
- VECTOR nodes: single VECTOR inside a frame without layoutMode is flattened to img, sized via absoluteRenderBounds
- IMAGE fill nodes: nodes with type:"IMAGE" in fills are also treated as images
- Passthrough nodes: frames with a single child and no visual styles are removed, layout properties transplanted to child
- DSL padding uses 1:1 mapping (.pt, .pr, .pb, .pl) to preserve LLM conversion accuracy
- Image URLs extracted into $img variables with zero-padding ($img01, $img02...) to prevent hallucination
- Stage 2 LLM receives body only, no variable definitions (token reduction + hallucination prevention)
- LLM's job is limited to .as() (component declaration), .tag() (semantic HTML), .repeat(N) (repeat marker)
- .repeat(N): LLM marks, program diffs siblings -> extracts props -> generates data array + map() (separation of concerns)
- .as() means "componentize" only — no ambiguity with labeling
- All F nodes with .as() are componentized (granularity decisions are delegated to the LLM)
- Void elements (img, br, etc.) with children have their .tag() removed by validation
- .hugW / .hugH express width/height: fit-content (split from .hug to prevent information loss)
- Passthrough flattening: FIXED-size nodes are not flattened (prevents size information loss)

## LLM Findings
- Gemini Flash: fast and cheap, but unreliable for structural decisions (.repeat placement, void element handling)
- Gemini Pro: high quality, but tends to invent syntax not in the spec
- Zero-padding variable names ($img01 vs $img1) reduces hallucination
- Including concrete correct/incorrect examples in prompts improves accuracy
- The less work delegated to the LLM, the more stable the output

## Token Reduction
- Figma JSON: 73,528 tokens
- LLM input (prompt + body DSL): 2,533 tokens
- Reduction: 96.6% (~1/29)

## MCP Server
The pipeline is exposed as an MCP server, directly usable from MCP clients like Claude Code.

### Motivation
- Figma MCP passes raw design JSON to the LLM, consuming massive tokens (73,528)
- Loom's DSL compression achieves 96.6% reduction (2,533 tokens)

### Tools
- `generate-dsl`: Figma URL -> DSL body (Stage 1.5)
- `generate-react`: semantic DSL -> React components, cached server-side (Stage 2.5)
- `list-components`: list cached component names
- `get-component`: retrieve a specific cached component's code

### Flow
1. MCP client calls `generate-dsl` -> receives DSL body
2. MCP client (LLM) annotates DSL with .as, .tag, .repeat (Stage 2)
3. MCP client calls `generate-react` -> React components generated and cached
4. MCP client retrieves components via `get-component` as needed
