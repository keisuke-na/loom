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
- `.hug` = `width: fit-content`
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
- `@repeat("arrayName", N)` = marks the start of a repeating pattern (N = number of items)
- `@prop("name")` = marks a variable part within the template
- `@data` = separates the template from the actual data
- `@end` = marks the end of a repeating pattern

Example:
```
@repeat("episodes", 3)
F.as("EpisodeRow") >
  I.src(@prop("image")).w56.h56
  T @prop("title")
  T @prop("subtitle")
@data
  { image: $img6, title: "The Daily Grind", subtitle: "Episode 12: The Future of Work" }
  { image: $img7, title: "Tech Talk Today", subtitle: "Episode 5: AI in Healthcare" }
  { image: $img8, title: "Mindful Moments", subtitle: "Episode 20: Stress Management" }
@end
```

## Conversion Rules
- `RULE: Every F tag MUST include display:flex. No exceptions.`
- `RULE: In inline style attributes, font-family names MUST use single quotes.`
