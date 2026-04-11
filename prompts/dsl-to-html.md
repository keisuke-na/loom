# Loom DSL Specification v0.2

## Overview
Loom DSL is a compact notation for describing UI layouts. 
Your task is to convert Loom DSL into valid HTML + inline CSS.

## Critical Rules
- RULE: Every F tag MUST include `display:flex`. No exceptions.
- RULE: In inline style attributes, font-family names MUST use single quotes. Example: `font-family: 'Spline Sans'`

## Syntax Rules

### Tags
- `F` = Flex container (`<div>` with `display: flex`)
- `T` = Text (`<span>`)
- `I` = Image (`<img>`)

### Direction (after F)
- `F.col` = `flex-direction: column`
- `F.row` = `flex-direction: row`

### Sizing
- `.stretch` = `align-self: stretch`
- `.fill` = `flex: 1`
- `.hug` = `width: fit-content` (or `height: fit-content`)
- `.w{N}` = `width: Npx` (e.g., `.w390` = `width: 390px`)
- `.h{N}` = `height: Npx`

### Spacing
- `.p{N}` = `padding: Npx` (all sides)
- `.px{N}` = `padding-left: Npx; padding-right: Npx`
- `.py{N}` = `padding-top: Npx; padding-bottom: Npx`
- `.pt{N}`, `.pr{N}`, `.pb{N}`, `.pl{N}` = individual padding
- `.gap{N}` = `gap: Npx`

### Alignment
- `.center` = `align-items: center`
- `.end` = `align-items: flex-end`
- `.jcenter` = `justify-content: center`
- `.jend` = `justify-content: flex-end`
- `.between` = `justify-content: space-between`

### Visual
- `.bg(R,G,B)` = `background-color: rgba(R,G,B,1)` (values 0-255)
- `.r{N}` = `border-radius: Npx`
- `.r(TL,TR,BR,BL)` = `border-radius: TLpx TRpx BRpx BLpx`
- `.border(R,G,B)` = `border: 1px solid rgba(R,G,B,1)`

### Text Styles
- `.bold` = `font-weight: 700`
- `.medium` = `font-weight: 500`
- `.s{N}` = `font-size: Npx`
- `.c(R,G,B)` = `color: rgba(R,G,B,1)`
- `.leading{N}` = `line-height: Npx`
- `.tracking{N}` = `letter-spacing: Npx`
- `.font("name")` = `font-family: 'name'`

### Image
- `I.src("url")` = `src="url"`
- `.cover` = `object-fit: cover`
- `.alt("text")` = `alt="text"` (HTML attribute, not CSS)

### Nesting
- `>` indicates children (indentation based)
- Each indentation level = one nesting level

### Style Variables (reuse)
- `$name = ...` defines a reusable style
- Reference with `$name`

## Task

Convert the Loom DSL input into valid HTML with inline CSS.
Apply all style variables ($font, $white, etc.) by substituting their values.
Output clean, properly indented HTML.
