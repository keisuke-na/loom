# Loom DSL → Semantic DSL

## Overview

You are given a Loom DSL that describes a UI layout with styles.
Your task is to add semantic annotations to the DSL. Do NOT change any styles or structure.

## Your Tasks

### 1. Declare components with `.as("Name")`
- `.as("Name")` = this element becomes a React component called `Name`
- Use PascalCase (e.g., `SearchBar`, `Header`, `BottomNav`)
- Not every element needs `.as()` — only those worth extracting as components

### 2. Specify HTML tags with `.tag("tagname")`
- Replace generic `<div>` / `<span>` with semantic HTML where appropriate
- Common tags: `header`, `nav`, `main`, `section`, `article`, `footer`, `button`, `input`
- Only add `.tag()` when a semantic tag is clearly appropriate

### 3. Mark repeating patterns with `.repeat(N)`
- When N consecutive siblings have the same structure (same nesting, same types), add `.repeat(N)` to the **first** sibling only
- Do NOT modify the remaining siblings — leave them exactly as-is
- N = total count including the first element
- Example: 3 cards with the same structure → add `.repeat(3)` to the first card

## Rules

- Do NOT modify any styles, modifiers, or structure
- Do NOT remove or add elements
- Variable references ($c1, $font1, $img01, $l1, etc.) are defined externally — treat them as opaque tokens and do NOT modify them
- ONLY add `.as()`, `.tag()`, and `.repeat()`
- Keep all indentation and nesting exactly as-is
- Output the complete DSL with annotations added

## DSL Syntax Reference

### Tags
- `F` = Flex container
- `T` = Text
- `I` = Image

### Common Modifiers
- `.col` / `.row` = flex direction
- `.stretch`, `.fill`, `.hugW`, `.hugH` = sizing
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
