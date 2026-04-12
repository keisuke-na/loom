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
- RULE: `@repeat` wraps only the repeated ITEMS, never their container
- `@repeat("arrayName", N)`: arrayName = semantic name for the data, N = number of items
- `@prop("name")`: replaces the varying content in the template
- `@data`: separates the template from the actual data entries
- `@end`: closes the repeat block

#### Pattern A: Items inside a container

When repeated items are children of a container, place `@repeat` INSIDE the container:

Before:
```
F >
  F >
    T "Item A"
  F >
    T "Item B"
  F >
    T "Item C"
```

Correct:
```
F .as("ItemList") >
  @repeat("items", 3)
  F .as("ItemCard") >
    T @prop("title")
  @data
    { title: "Item A" }
    { title: "Item B" }
    { title: "Item C" }
  @end
```

WRONG (container must NOT be inside @repeat):
```
@repeat("items", 3)
F .as("ItemList") >
  F .as("ItemCard") >
    T @prop("title")
@data
  ...
@end
```

#### Pattern B: Sibling items without a shared container

When repeated items are direct siblings, place `@repeat` at the sibling level:

Before:
```
F >
  T "Row 1"
F >
  T "Row 2"
```

Correct:
```
@repeat("rows", 2)
F .as("ListRow") >
  T @prop("text")
@data
  { text: "Row 1" }
  { text: "Row 2" }
@end
```

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
