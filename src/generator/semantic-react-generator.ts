import type { DslNode } from "../parser/dsl-parser.js";

type CSSProperties = Record<string, string>;

// Reverse DSL map: modifier → CSS properties
function modifierToCSS(mod: string): CSSProperties {
  const css: CSSProperties = {};

  // Direction
  if (mod === ".col") { css["flex-direction"] = "column"; return css; }
  if (mod === ".row") { css["flex-direction"] = "row"; return css; }

  // Sizing
  if (mod === ".fill") { css["flex"] = "1"; return css; }
  if (mod === ".stretch") { css["align-self"] = "stretch"; return css; }
  if (mod === ".hugW") { css["width"] = "fit-content"; return css; }
  if (mod === ".hugH") { css["height"] = "fit-content"; return css; }
  if (mod === ".bold") { css["font-weight"] = "700"; return css; }
  if (mod === ".medium") { css["font-weight"] = "500"; return css; }
  if (mod === ".cover") { css["object-fit"] = "cover"; return css; }
  if (mod === ".center") { css["align-items"] = "center"; return css; }
  if (mod === ".end") { css["align-items"] = "flex-end"; return css; }
  if (mod === ".jcenter") { css["justify-content"] = "center"; return css; }
  if (mod === ".jend") { css["justify-content"] = "flex-end"; return css; }
  if (mod === ".between") { css["justify-content"] = "space-between"; return css; }

  // Parametric modifiers
  let match;

  match = mod.match(/^\.w(\d+)$/);
  if (match) { css["width"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.h(\d+)$/);
  if (match) { css["height"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.pt(\d+)$/);
  if (match) { css["padding-top"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.pr(\d+)$/);
  if (match) { css["padding-right"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.pb(\d+)$/);
  if (match) { css["padding-bottom"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.pl(\d+)$/);
  if (match) { css["padding-left"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.gap(\d+)$/);
  if (match) { css["gap"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.r(\d+)$/);
  if (match) { css["border-radius"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.r\((\d+),(\d+),(\d+),(\d+)\)$/);
  if (match) { css["border-radius"] = `${match[1]}px ${match[2]}px ${match[3]}px ${match[4]}px`; return css; }

  match = mod.match(/^\.s(\d+)$/);
  if (match) { css["font-size"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.leading(\d+)$/);
  if (match) { css["line-height"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.tracking(\d+)$/);
  if (match) { css["letter-spacing"] = `${match[1]}px`; return css; }

  match = mod.match(/^\.bg\((\d+),(\d+),(\d+)\)$/);
  if (match) { css["background-color"] = `rgba(${match[1]},${match[2]},${match[3]},1)`; return css; }

  match = mod.match(/^\.c\((\d+),(\d+),(\d+)\)$/);
  if (match) { css["color"] = `rgba(${match[1]},${match[2]},${match[3]},1)`; return css; }

  match = mod.match(/^\.border\((\d+),(\d+),(\d+)\)$/);
  if (match) { css["border"] = `1px solid rgba(${match[1]},${match[2]},${match[3]},1)`; return css; }

  match = mod.match(/^\.font\("([^"]*)"\)$/);
  if (match) { css["font-family"] = `'${match[1]}'`; return css; }

  return css;
}

function tokenizeModifiers(modStr: string): string[] {
  const tokens: string[] = [];
  // Match: .word123 (with digits), .word(args), .word, $variable
  const regex = /(\.[a-zA-Z]+\d+|\.[a-zA-Z]+\([^)]*\)|\.[a-zA-Z]+|\$\w+)/g;
  let match;
  while ((match = regex.exec(modStr)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

function resolveModifiers(
  modStr: string,
  vars: Record<string, string>
): { css: CSSProperties; src?: string; alt?: string } {
  const css: CSSProperties = {};
  let src: string | undefined;
  let alt: string | undefined;

  // First expand variables
  let expanded = modStr;
  for (const [name, value] of Object.entries(vars)) {
    // Image variables are quoted strings, style variables are modifier chains
    expanded = expanded.replaceAll(name, value.startsWith('"') ? name : value);
  }

  const tokens = tokenizeModifiers(expanded);

  for (const token of tokens) {
    // Handle .src($imgN) or .src("url")
    let match = token.match(/^\.src\((\$\w+)\)$/);
    if (match) {
      const imgVar = match[1];
      const url = vars[imgVar];
      src = url ? url.replace(/^"|"$/g, "") : "";
      continue;
    }
    match = token.match(/^\.src\("([^"]*)"\)$/);
    if (match) {
      src = match[1];
      continue;
    }

    // Handle .alt("text")
    match = token.match(/^\.alt\("([^"]*)"\)$/);
    if (match) {
      alt = match[1];
      continue;
    }

    // Skip .as() and .tag() — handled separately
    if (token.startsWith(".as(") || token.startsWith(".tag(")) continue;

    // Variable reference that wasn't expanded (shouldn't happen)
    if (token.startsWith("$")) continue;

    // Regular modifier
    const modCss = modifierToCSS(token);
    Object.assign(css, modCss);
  }

  return { css, src, alt };
}

function formatStyle(css: CSSProperties): string {
  if (Object.keys(css).length === 0) return "";
  const entries = Object.entries(css)
    .map(([k, v]) => {
      const camel = k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return `${camel}: "${v}"`;
    })
    .join(", ");
  return ` style={{ ${entries} }}`;
}

interface PropDiff {
  propName: string;
  kind: "text" | "src";
  values: string[];
}

function zeroPad(n: number): string {
  return n.toString().padStart(2, "0");
}

function diffNodes(siblings: DslNode[], vars: Record<string, string>): PropDiff[] {
  const diffs: PropDiff[] = [];
  let textIndex = 1;
  let imageIndex = 1;

  function walk(nodes: DslNode[]) {
    const first = nodes[0];

    // Compare text
    if (first.tag === "T" && first.text !== undefined) {
      const texts = nodes.map((n) => n.text ?? "");
      if (!texts.every((t) => t === texts[0])) {
        diffs.push({ propName: `text${zeroPad(textIndex++)}`, kind: "text", values: texts });
      }
    }

    // Compare image src
    if (first.tag === "I") {
      const srcs = nodes.map((n) => {
        const srcMatch = n.modifiers.match(/\.src\(([^)]+)\)/);
        if (!srcMatch) return "";
        const ref = srcMatch[1];
        if (ref.startsWith("$")) {
          const url = vars[ref];
          return url ? url.replace(/^"|"$/g, "") : ref;
        }
        return ref.replace(/^"|"$/g, "");
      });
      if (!srcs.every((s) => s === srcs[0])) {
        diffs.push({ propName: `image${zeroPad(imageIndex++)}`, kind: "src", values: srcs });
      }
    }

    // Recurse into children
    if (first.children.length > 0) {
      for (let i = 0; i < first.children.length; i++) {
        const childGroup = nodes.map((n) => n.children[i]);
        walk(childGroup);
      }
    }
  }

  walk(siblings);
  return diffs;
}

function renderNode(
  node: DslNode,
  indent: number,
  vars: Record<string, string>,
  componentNames: Set<string>
): string {
  const pad = "  ".repeat(indent);

  // If this F node is a registered component, render as component reference
  if (node.tag === "F" && node.as && componentNames.has(node.as)) {
    return `${pad}<${node.as} />`;
  }

  const { css, src, alt } = resolveModifiers(node.modifiers, vars);

  // F nodes always have display: flex
  if (node.tag === "F") {
    css["display"] = "flex";
  }

  const htmlTag = node.htmlTag ?? (node.tag === "T" ? "span" : node.tag === "I" ? "img" : "div");

  // F node with .tag("input") — convert child T text to placeholder
  if (node.tag === "F" && htmlTag === "input") {
    const childT = node.children.find((c) => c.tag === "T");
    if (childT) {
      const { css: textCss } = resolveModifiers(childT.modifiers, vars);
      Object.assign(css, textCss);
    }
    const styleAttr = formatStyle(css);
    const placeholder = childT?.text ?? "";
    return `${pad}<input${styleAttr} placeholder="${placeholder}" />`;
  }

  const styleAttr = formatStyle(css);

  // Image node
  if (node.tag === "I") {
    const srcAttr = src ? ` src="${src}"` : "";
    const altAttr = alt ? ` alt="${alt}"` : "";
    return `${pad}<${htmlTag}${srcAttr}${styleAttr}${altAttr} />`;
  }

  // Text node
  if (node.tag === "T") {
    const text = node.text ?? "";
    if (htmlTag === "input") {
      return `${pad}<${htmlTag}${styleAttr} placeholder="${text}" />`;
    }
    return `${pad}<${htmlTag}${styleAttr}>${text}</${htmlTag}>`;
  }

  // Container node
  if (node.children.length === 0) {
    return `${pad}<${htmlTag}${styleAttr} />`;
  }

  const childrenCode = renderChildren(node.children, indent + 1, vars, componentNames);

  return `${pad}<${htmlTag}${styleAttr}>\n${childrenCode}\n${pad}</${htmlTag}>`;
}

function renderChildren(
  children: DslNode[],
  indent: number,
  vars: Record<string, string>,
  componentNames: Set<string>
): string {
  const lines: string[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i];

    if (child.repeat && child.repeat >= 2) {
      const n = child.repeat;
      const siblings = children.slice(i, i + n);
      const componentName = child.as ?? "Item";
      const diffs = diffNodes(siblings, vars);
      const pad = "  ".repeat(indent);

      if (diffs.length > 0) {
        const dataEntries = Array.from({ length: n }, (_, idx) => {
          const fields = diffs
            .map((d) => `${d.propName}: "${d.values[idx]}"`)
            .join(", ");
          return `  { ${fields} }`;
        });
        const arrayName = `${componentName.charAt(0).toLowerCase()}${componentName.slice(1)}Data`;
        lines.push(`${pad}{${arrayName}.map((item, index) => (\n${pad}  <${componentName} key={index} {...item} />\n${pad}))}`);

        // Register data array for later output
        componentNames.add(componentName);
        repeatDataArrays.push(`const ${arrayName} = [\n${dataEntries.join(",\n")}\n];`);
        repeatComponents.push(renderRepeatComponentDef(child, diffs, vars, componentNames));
      } else {
        lines.push(renderNode(child, indent, vars, componentNames));
      }

      i += n;
    } else {
      lines.push(renderNode(child, indent, vars, componentNames));
      i++;
    }
  }

  return lines.join("\n");
}

function renderRepeatComponentDef(
  template: DslNode,
  diffs: PropDiff[],
  vars: Record<string, string>,
  componentNames: Set<string>
): string {
  const name = template.as ?? "Item";
  const propsParam = `{ ${diffs.map((d) => d.propName).join(", ")} }: { ${diffs.map((d) => `${d.propName}: string`).join("; ")} }`;

  const body = renderRepeatNode(template, 2, diffs, vars, componentNames);

  return `function ${name}(${propsParam}) {\n  return (\n${body}\n  );\n}`;
}

function renderRepeatNode(
  node: DslNode,
  indent: number,
  diffs: PropDiff[],
  vars: Record<string, string>,
  componentNames: Set<string>
): string {
  const pad = "  ".repeat(indent);
  const { css, src, alt } = resolveModifiers(node.modifiers, vars);

  if (node.tag === "F") {
    css["display"] = "flex";
  }

  const htmlTag = node.htmlTag ?? (node.tag === "T" ? "span" : node.tag === "I" ? "img" : "div");
  const styleAttr = formatStyle(css);

  // Image node — check if src is a prop
  if (node.tag === "I") {
    const srcDiff = diffs.find((d) => d.kind === "src" && d.values[0] === getSrc(node, vars));
    const srcAttr = srcDiff ? ` src={${srcDiff.propName}}` : (src ? ` src="${src}"` : "");
    const altAttr = alt ? ` alt="${alt}"` : "";
    return `${pad}<${htmlTag}${srcAttr}${styleAttr}${altAttr} />`;
  }

  // Text node — check if text is a prop
  if (node.tag === "T") {
    const text = node.text ?? "";
    const textDiff = diffs.find((d) => d.kind === "text" && d.values[0] === text);
    if (textDiff) {
      return `${pad}<${htmlTag}${styleAttr}>{${textDiff.propName}}</${htmlTag}>`;
    }
    return `${pad}<${htmlTag}${styleAttr}>${text}</${htmlTag}>`;
  }

  // Container
  if (node.children.length === 0) {
    return `${pad}<${htmlTag}${styleAttr} />`;
  }

  const childrenCode = node.children
    .map((child) => renderRepeatNode(child, indent + 1, diffs, vars, componentNames))
    .join("\n");

  return `${pad}<${htmlTag}${styleAttr}>\n${childrenCode}\n${pad}</${htmlTag}>`;
}

function getSrc(node: DslNode, vars: Record<string, string>): string {
  const srcMatch = node.modifiers.match(/\.src\(([^)]+)\)/);
  if (!srcMatch) return "";
  const ref = srcMatch[1];
  if (ref.startsWith("$")) {
    const url = vars[ref];
    return url ? url.replace(/^"|"$/g, "") : ref;
  }
  return ref.replace(/^"|"$/g, "");
}

function renderStaticComponentDef(
  node: DslNode,
  vars: Record<string, string>,
  componentNames: Set<string>
): string {
  const name = node.as ?? "Component";
  const { css } = resolveModifiers(node.modifiers, vars);
  css["display"] = "flex";
  const htmlTag = node.htmlTag ?? "div";
  const styleAttr = formatStyle(css);

  const childrenCode = renderChildren(node.children, 2, vars, componentNames);

  if (node.children.length === 0) {
    return `function ${name}() {\n  return (\n    <${htmlTag}${styleAttr} />\n  );\n}`;
  }

  return `function ${name}() {\n  return (\n    <${htmlTag}${styleAttr}>\n${childrenCode}\n    </${htmlTag}>\n  );\n}`;
}

// Module-level arrays populated during rendering
let repeatComponents: string[] = [];
let repeatDataArrays: string[] = [];

export function generateSemanticReact(
  nodes: DslNode[],
  vars: Record<string, string>
): string {
  repeatComponents = [];
  repeatDataArrays = [];

  // Collect all component names (.as() F nodes)
  const componentNames = new Set<string>();
  const components: string[] = [];

  function collectComponentNames(items: DslNode[]) {
    for (const item of items) {
      if (item.tag === "F" && item.as) {
        componentNames.add(item.as);
      }
      collectComponentNames(item.children);
    }
  }
  collectComponentNames(nodes);

  // Generate main component body (this populates repeatComponents/repeatDataArrays)
  const mainBody = renderChildren(nodes, 2, vars, componentNames);

  // Generate .as() component definitions (non-repeat)
  function findStaticComponents(items: DslNode[]) {
    for (const item of items) {
      if (item.tag === "F" && item.as && !repeatComponents.some((c) => c.startsWith(`function ${item.as}(`))) {
        if (!components.some((c) => c.startsWith(`function ${item.as}(`))) {
          components.push(renderStaticComponentDef(item, vars, componentNames));
        }
      }
      findStaticComponents(item.children);
    }
  }
  findStaticComponents(nodes);

  const parts: string[] = ['import React from "react";'];

  // Repeat component definitions first
  if (repeatComponents.length > 0) {
    parts.push(repeatComponents.join("\n\n"));
  }

  // Static component definitions
  if (components.length > 0) {
    parts.push(components.join("\n\n"));
  }

  // Data arrays
  if (repeatDataArrays.length > 0) {
    parts.push(repeatDataArrays.join("\n\n"));
  }

  parts.push(`export default function App() {\n  return (\n${mainBody}\n  );\n}`);

  return parts.join("\n\n");
}
