import type { FigmaNode } from "../api/figma-client.js";
import { hasImageFill } from "../api/figma-client.js";
import { collectStyles } from "../transformers/node.js";

function parseRgba(value: string): string {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return value;
  return `${match[1]},${match[2]},${match[3]}`;
}

function round(value: string): number {
  return Math.round(parseFloat(value));
}

const DSL_MAP: Record<string, (value: string) => string> = {
  "flex-direction": (v) => (v === "column" ? ".col" : ".row"),
  "flex": () => ".fill",
  "align-self": (v) => (v === "stretch" ? ".stretch" : ""),
  "width": (v) => (v === "fit-content" ? ".hug" : `.w${round(v)}`),
  "height": (v) => (v === "fit-content" ? "" : `.h${round(v)}`),
  "gap": (v) => `.gap${round(v)}`,
  "align-items": (v) => {
    if (v === "center") return ".center";
    if (v === "flex-end") return ".end";
    return "";
  },
  "justify-content": (v) => {
    if (v === "space-between") return ".between";
    if (v === "center") return ".jcenter";
    if (v === "flex-end") return ".jend";
    return "";
  },
  "background-color": (v) => `.bg(${parseRgba(v)})`,
  "border-radius": (v) => {
    const parts = v.split(" ");
    if (parts.length === 4) {
      const values = parts.map((p) => round(p));
      return `.r(${values.join(",")})`;
    }
    return `.r${round(v)}`;
  },
  "border": (v) => {
    const match = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? `.border(${match[1]},${match[2]},${match[3]})` : "";
  },
  "font-family": (v) => `.font("${v}")`,
  "font-size": (v) => `.s${round(v)}`,
  "font-weight": (v) => {
    if (v === "700") return ".bold";
    if (v === "500") return ".medium";
    return "";
  },
  "color": (v) => `.c(${parseRgba(v)})`,
  "line-height": (v) => `.leading${round(v)}`,
  "letter-spacing": (v) => {
    const n = round(v);
    return n !== 0 ? `.tracking${n}` : "";
  },
  "text-align": () => "",
  "object-fit": (v) => (v === "cover" ? ".cover" : ""),
};

// Skip display:flex (implied by F tag) and individual paddings (handled separately)
const SKIP_PROPS = new Set([
  "display",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
]);

function optimizePadding(styles: Record<string, string>): string {
  const pt = parseFloat(styles["padding-top"] ?? "0");
  const pr = parseFloat(styles["padding-right"] ?? "0");
  const pb = parseFloat(styles["padding-bottom"] ?? "0");
  const pl = parseFloat(styles["padding-left"] ?? "0");

  if (pt === 0 && pr === 0 && pb === 0 && pl === 0) return "";

  let result = "";
  if (pt > 0) result += `.pt${pt}`;
  if (pr > 0) result += `.pr${pr}`;
  if (pb > 0) result += `.pb${pb}`;
  if (pl > 0) result += `.pl${pl}`;

  return result;
}

function cssToModifiers(styles: Record<string, string>): string {
  let mods = "";

  // padding optimization
  mods += optimizePadding(styles);

  // other properties
  for (const [prop, value] of Object.entries(styles)) {
    if (SKIP_PROPS.has(prop)) continue;
    const mapper = DSL_MAP[prop];
    if (mapper) {
      mods += mapper(value);
    }
  }

  return mods;
}

function resolveTag(node: FigmaNode, children: FigmaNode[]): string {
  if (node.type === "TEXT") return "T";
  if (node.type === "VECTOR") return "I";
  if (hasImageFill(node) && children.length === 0) return "I";
  return "F";
}

function renderNode(
  node: FigmaNode,
  indent: number,
  imageMap: Record<string, string>,
  parentLayoutMode?: "HORIZONTAL" | "VERTICAL"
): string {
  const pad = "  ".repeat(indent);

  // filter empty placeholder frames
  const children = (node.children ?? []).filter(
    (c) => !(c.type === "FRAME" && !c.children?.length && !c.absoluteBoundingBox)
  );

  // icon wrapper: frame without layoutMode containing only a VECTOR
  if (!node.layoutMode && children.length === 1 && children[0].type === "VECTOR") {
    const vector = children[0];
    const src = imageMap[vector.id] ?? "";
    const bounds = vector.absoluteRenderBounds ?? node.absoluteBoundingBox;
    let mods = `.src("${src}")`;
    if (bounds) {
      mods += `.w${Math.round(bounds.width)}.h${Math.round(bounds.height)}`;
    }
    mods += `.alt("${vector.name}")`;
    return `${pad}I${mods}`;
  }

  const tag = resolveTag(node, children);
  const styles = collectStyles(node, parentLayoutMode);
  let mods = cssToModifiers(styles);

  // IMAGE fill node
  if (tag === "I" && hasImageFill(node)) {
    const src = imageMap[node.id] ?? "";
    mods += `.src("${src}")`;
    if (node.absoluteBoundingBox) {
      mods += `.w${node.absoluteBoundingBox.width}.h${node.absoluteBoundingBox.height}`;
    }
    mods += `.cover.alt("${node.name}")`;
    return `${pad}I${mods}`;
  }

  // VECTOR node
  if (tag === "I" && node.type === "VECTOR") {
    const src = imageMap[node.id] ?? "";
    mods += `.src("${src}").alt("${node.name}")`;
    return `${pad}I${mods}`;
  }

  // TEXT node
  if (tag === "T") {
    const text = node.characters ?? "";
    return `${pad}T${mods} "${text}"`;
  }

  // F (container) node
  if (children.length === 0) {
    return `${pad}F${mods}`;
  }

  const childrenDsl = children
    .map((child) => renderNode(child, indent + 1, imageMap, node.layoutMode))
    .join("\n");

  return `${pad}F${mods} >\n${childrenDsl}`;
}

function extractVariables(dsl: string): { definitions: string; body: string } {
  // Collect all color and font patterns with their frequencies
  const patterns = new Map<string, number>();

  // .bg(R,G,B), .c(R,G,B), .font("name")
  const regex = /\.(bg|c|font)\([^)]+\)/g;
  let match;
  while ((match = regex.exec(dsl)) !== null) {
    const pattern = match[0];
    patterns.set(pattern, (patterns.get(pattern) ?? 0) + 1);
  }

  // Filter to patterns appearing 2+ times, sort by frequency desc
  const frequent = [...patterns.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  if (frequent.length === 0) {
    return { definitions: "", body: dsl };
  }

  // Assign variable names
  let colorIndex = 1;
  let fontIndex = 1;
  const variables: { name: string; pattern: string }[] = [];

  for (const [pattern] of frequent) {
    let name: string;
    if (pattern.startsWith(".font")) {
      name = `$font${fontIndex++}`;
    } else {
      name = `$c${colorIndex++}`;
    }
    variables.push({ name, pattern });
  }

  // Build definitions
  const definitions = variables
    .map((v) => `${v.name} = ${v.pattern}`)
    .join("\n");

  // Replace color/font patterns in body
  let body = dsl;
  for (const v of variables) {
    body = body.replaceAll(v.pattern, ` ${v.name} `);
  }

  // B: Extract layout modifier patterns (3+ occurrences)
  const layoutPatterns = new Map<string, number>();
  for (const line of body.split("\n")) {
    // Match modifiers after F or T tag only (skip I to avoid src/alt matching)
    const m = line.match(/^\s*[FT]((?:\.[a-z][a-zA-Z0-9(),-]*)+)/);
    if (m) {
      const mods = m[1];
      layoutPatterns.set(mods, (layoutPatterns.get(mods) ?? 0) + 1);
    }
  }

  const frequentLayouts = [...layoutPatterns.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  let layoutIndex = 1;
  for (const [pattern] of frequentLayouts) {
    const name = `$l${layoutIndex++}`;
    variables.push({ name, pattern });
    body = body.replaceAll(pattern, ` ${name} `);
  }

  // Rebuild definitions with layout variables added
  const allDefinitions = variables
    .map((v) => `${v.name} = ${v.pattern}`)
    .join("\n");

  // Clean up: collapse multiple spaces but preserve leading indentation
  body = body
    .split("\n")
    .map((line) => {
      const indent = line.match(/^( *)/)?.[0] ?? "";
      const content = line.slice(indent.length).replace(/ {2,}/g, " ").trim();
      return indent + content;
    })
    .join("\n");

  return { definitions: allDefinitions, body };
}

function zeroPad(n: number): string {
  return n.toString().padStart(2, "0");
}

function extractImageVariables(dsl: string): { definitions: string; body: string } {
  const urlRegex = /\.src\("([^"]+)"\)/g;
  const urls = new Map<string, string>();
  let imgIndex = 1;
  let match;

  while ((match = urlRegex.exec(dsl)) !== null) {
    const url = match[1];
    if (!urls.has(url)) {
      urls.set(url, `$img${zeroPad(imgIndex++)}`);
    }
  }

  if (urls.size === 0) {
    return { definitions: "", body: dsl };
  }

  let body = dsl;
  const definitions: string[] = [];
  for (const [url, name] of urls) {
    definitions.push(`${name} = "${url}"`);
    body = body.replaceAll(`.src("${url}")`, `.src(${name})`);
  }

  return { definitions: definitions.join("\n"), body };
}

export function generateDsl(
  node: FigmaNode,
  imageMap: Record<string, string> = {},
  bodyOnly: boolean = false
): string {
  const raw = renderNode(node, 0, imageMap);
  const { definitions: imgDefs, body: imgBody } = extractImageVariables(raw);
  const { definitions: styleDefs, body } = extractVariables(imgBody);

  if (bodyOnly) {
    return body;
  }

  const allDefs = [imgDefs, styleDefs].filter(Boolean).join("\n");
  if (allDefs) {
    return `${allDefs}\n\n${body}`;
  }
  return body;
}
