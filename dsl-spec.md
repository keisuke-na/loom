# Loom DSL Specification v0.3

## Tags
- `F` = Flex container (`<div>` with `display: flex`)
- `T` = Text (`<span>`)
- `I` = Image (`<img>`)

## Direction
- `F.col` = `flex-direction: column`
- `F.row` = `flex-direction: row`

## Size
- `.stretch` = `align-self: stretch`
- `.fill` = `flex: 1`
- `.hugW` = `width: fit-content`
- `.hugH` = `height: fit-content`
- `.w{N}` = `width: Npx`
- `.h{N}` = `height: Npx`

## Spacing
- `.pt{N}` = `padding-top: Npx`
- `.pr{N}` = `padding-right: Npx`
- `.pb{N}` = `padding-bottom: Npx`
- `.pl{N}` = `padding-left: Npx`
- `.gap{N}` = `gap: Npx`

## Alignment
- `.center` = `align-items: center`
- `.end` = `align-items: flex-end`
- `.jcenter` = `justify-content: center`
- `.jend` = `justify-content: flex-end`
- `.between` = `justify-content: space-between`

## Visual
- `.bg(R,G,B)` = `background-color: rgba(R,G,B,1)`
- `.r{N}` = `border-radius: Npx`
- `.r(TL,TR,BR,BL)` = `border-radius: TLpx TRpx BRpx BLpx`
- `.border(R,G,B)` = `border: 1px solid rgba(R,G,B,1)`

## Text
- `.bold` = `font-weight: 700`
- `.medium` = `font-weight: 500`
- `.s{N}` = `font-size: Npx`
- `.c(R,G,B)` = `color: rgba(R,G,B,1)`
- `.leading{N}` = `line-height: Npx`
- `.tracking{N}` = `letter-spacing: Npx`
- `.font("name")` = `font-family: 'name'`

## Image
- `I.src("url")` = `src="url"`
- `.cover` = `object-fit: cover`
- `.alt("text")` = `alt="text"` (HTML attribute, not CSS)

## Nesting
- `>` indicates child elements
- Indentation represents nesting depth

## Style Variables
- `$name = ...` defines a reusable style
- Reference with `$name`

## Semantic Annotations

### Component Naming
- `.as("Name")` = assigns a component name to the element
- Example: `F.row.stretch.as("SearchBar") >`

### Semantic HTML Tag
- `.tag("tagname")` = specifies the HTML tag to use instead of `<div>` or `<span>`
- Example: `F.row.as("BottomNav").tag("nav") >`

### Repeating Patterns
- `.repeat(N)` = marks the first element of N consecutive siblings with the same structure
- Attach to the first sibling only; the following N-1 siblings remain unchanged

Example:
```
F $l5 .repeat(3) >
  I.r12.src($img03).w240.h240.cover.alt("Depth 5, Frame 0")
  F $l1 >
    T $c1 $font1 .s16.medium.leading24 "The Daily Grind"
    T $c2 $font1 .s14.leading21 "Daily news and insights"
F $l5 >
  I.r12.src($img04).w240.h240.cover.alt("Depth 5, Frame 0")
  F $l1 >
    T $c1 $font1 .s16.medium.leading24 "Tech Talk Today"
    T $c2 $font1 .s14.leading21 "Latest tech trends"
F $l5 >
  I.r12.src($img05).w240.h240.cover.alt("Depth 5, Frame 0")
  F $l1 >
    T $c1 $font1 .s16.medium.leading24 "Mindful Moments"
    T $c2 $font1 .s14.leading21 "Meditation and wellness"
```

## Conversion Rules
- `RULE: Every F tag MUST include display:flex. No exceptions.`
- `RULE: In inline style attributes, font-family names MUST use single quotes.`
