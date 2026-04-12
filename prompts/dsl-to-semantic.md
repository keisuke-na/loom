# Loom DSL → Semantic DSL

## Overview

You are given a Loom DSL that describes a UI layout with styles.
Your task is to add **semantic annotations** to the DSL. Do NOT change any styles or structure.

## Your Tasks

### 1. Name components with `.as("Name")`
- Give meaningful names to elements based on their content and role
- Use PascalCase (e.g., `SearchBar`, `EpisodeRow`, `BottomNav`)
- Not every element needs a name — only semantically meaningful ones

### 2. Specify HTML tags with `.tag("tagname")`
- Replace generic `<div>` / `<span>` with semantic HTML where appropriate
- Common tags: `header`, `nav`, `main`, `section`, `article`, `footer`, `button`, `input`
- Only add `.tag()` when a semantic tag is clearly appropriate

### 3. Mark repeating patterns with `@repeat` / `@end`
- Identify groups of elements that share the same structure but different data
- Convert them into a template + data format:

```
@repeat("arrayName", N)
F.as("ComponentName") >
  I.src(@prop("propName"))
  T @prop("propName")
@data
  { propName: "value1", ... }
  { propName: "value2", ... }
@end
```

- `@repeat("arrayName", N)`: arrayName = semantic name for the data, N = number of items
- `@prop("name")`: replaces the varying content in the template
- `@data`: separates the template from the actual data entries
- `@end`: closes the repeat block

## Rules

- Do NOT modify any styles, modifiers, or structure
- Do NOT remove or add elements
- Variable references ($c1, $font1, $img1, $l1, etc.) are defined externally — treat them as opaque tokens and do NOT modify them
- ONLY add `.as()`, `.tag()`, `@repeat`, `@prop`, `@data`, `@end`
- Keep all indentation and nesting exactly as-is
- Output the complete DSL with annotations added

## DSL Syntax Reference

### Tags
- `F` = Flex container
- `T` = Text
- `I` = Image

### Common Modifiers
- `.col` / `.row` = flex direction
- `.stretch`, `.fill`, `.hug` = sizing
- `.pt{N}`, `.pr{N}`, `.pb{N}`, `.pl{N}` = padding
- `.gap{N}` = gap
- `.center`, `.between` = alignment
- `.bg(R,G,B)` = background color
- `.c(R,G,B)` = text color
- `.r{N}` = border radius
- `.s{N}` = font size
- `.bold`, `.medium` = font weight
- `$name` = style variable reference
- `>` = has children (indentation based nesting)

## Input

Convert the following DSL by adding semantic annotations:
