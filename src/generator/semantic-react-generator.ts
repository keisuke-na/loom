import type { DslNode, RepeatBlock } from "../parser/dsl-parser.js";

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
  if (mod === ".hug") { css["width"] = "fit-content"; return css; }
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

function renderNode(
  node: DslNode,
  indent: number,
  vars: Record<string, string>
): string {
  const pad = "  ".repeat(indent);
  const { css, src, alt } = resolveModifiers(node.modifiers, vars);

  // F nodes always have display: flex
  if (node.tag === "F") {
    css["display"] = "flex";
  }

  const htmlTag = node.htmlTag ?? (node.tag === "T" ? "span" : node.tag === "I" ? "img" : "div");
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
    return `${pad}<${htmlTag}${styleAttr}>${text}</${htmlTag}>`;
  }

  // Container node
  if (node.children.length === 0) {
    return `${pad}<${htmlTag}${styleAttr} />`;
  }

  const childrenCode = node.children
    .map((child) => renderChild(child, indent + 1, vars))
    .join("\n");

  return `${pad}<${htmlTag}${styleAttr}>\n${childrenCode}\n${pad}</${htmlTag}>`;
}

function renderRepeat(
  block: RepeatBlock,
  indent: number,
  vars: Record<string, string>
): string {
  const pad = "  ".repeat(indent);
  const componentName = block.template.as ?? "Item";

  // Generate the component
  const componentCode = renderComponentDef(block.template, vars);

  // Generate the map call
  const dataArrayName = block.arrayName;
  const mapCode = `${pad}{${dataArrayName}.map((item, index) => (\n${pad}  <${componentName} key={index} {...item} />\n${pad}))}`;

  return { componentCode, mapCode } as unknown as string;
}

function renderComponentDef(
  node: DslNode,
  vars: Record<string, string>
): string {
  // Build props interface from the template
  const propNames = collectProps(node);
  const propsParam = propNames.length > 0
    ? `{ ${propNames.join(", ")} }: { ${propNames.map((p) => `${p}: string`).join("; ")} }`
    : "";

  const body = renderNodeWithProps(node, 1, vars);

  const name = node.as ?? "Component";
  return `function ${name}(${propsParam}) {\n  return (\n${body}\n  );\n}`;
}

function collectProps(node: DslNode): string[] {
  const props: string[] = [];
  const propRegex = /@prop\("([^"]*)"\)/g;

  function walk(n: DslNode) {
    let match;
    while ((match = propRegex.exec(n.modifiers)) !== null) {
      if (!props.includes(match[1])) props.push(match[1]);
    }
    if (n.text && n.text.includes("@prop")) {
      const textMatch = n.text.match(/@prop\("([^"]*)"\)/);
      if (textMatch && !props.includes(textMatch[1])) props.push(textMatch[1]);
    }
    for (const child of n.children) {
      if ("tag" in child) walk(child);
    }
  }
  walk(node);
  return props;
}

function renderNodeWithProps(
  node: DslNode,
  indent: number,
  vars: Record<string, string>
): string {
  const pad = "  ".repeat(indent);

  // Replace @prop references in modifiers
  let modifiers = node.modifiers.replace(/@prop\("(\w+)"\)/g, (_, name) => `\${${name}}`);
  const { css, src, alt } = resolveModifiers(modifiers, vars);

  if (node.tag === "F") {
    css["display"] = "flex";
  }

  const htmlTag = node.htmlTag ?? (node.tag === "T" ? "span" : node.tag === "I" ? "img" : "div");
  const styleAttr = formatStyle(css);

  // Image node with props
  if (node.tag === "I") {
    // Check if src contains a prop reference
    const srcMatch = node.modifiers.match(/\.src\(@prop\("(\w+)"\)\)/);
    const altMatch = node.modifiers.match(/\.alt\(@prop\("(\w+)"\)\)/);
    const srcAttr = srcMatch ? ` src={${srcMatch[1]}}` : (src ? ` src="${src}"` : "");
    const altAttr = altMatch ? ` alt={${altMatch[1]}}` : (alt ? ` alt="${alt}"` : "");
    return `${pad}<${htmlTag}${srcAttr}${styleAttr}${altAttr} />`;
  }

  // Text node with props
  if (node.tag === "T") {
    const propMatch = node.text?.match(/@prop\("(\w+)"\)/);
    if (propMatch) {
      return `${pad}<${htmlTag}${styleAttr}>{${propMatch[1]}}</${htmlTag}>`;
    }
    return `${pad}<${htmlTag}${styleAttr}>${node.text ?? ""}</${htmlTag}>`;
  }

  // Container
  if (node.children.length === 0) {
    return `${pad}<${htmlTag}${styleAttr} />`;
  }

  const childrenCode = node.children
    .map((child) => {
      if ("tag" in child) return renderNodeWithProps(child, indent + 1, vars);
      return ""; // Shouldn't have nested repeats in template
    })
    .join("\n");

  return `${pad}<${htmlTag}${styleAttr}>\n${childrenCode}\n${pad}</${htmlTag}>`;
}

function renderChild(
  child: DslNode | RepeatBlock,
  indent: number,
  vars: Record<string, string>
): string {
  if ("kind" in child && child.kind === "repeat") {
    // For repeat blocks, render the map() call inline
    const pad = "  ".repeat(indent);
    const componentName = child.template.as ?? "Item";
    const dataArrayName = child.arrayName;
    return `${pad}{${dataArrayName}.map((item, index) => (\n${pad}  <${componentName} key={index} {...item} />\n${pad}))}`;
  }
  return renderNode(child as DslNode, indent, vars);
}

export function generateSemanticReact(
  nodes: (DslNode | RepeatBlock)[],
  vars: Record<string, string>
): string {
  // Collect all repeat blocks to generate component definitions
  const components: string[] = [];
  function findRepeats(items: (DslNode | RepeatBlock)[]) {
    for (const item of items) {
      if ("kind" in item && item.kind === "repeat") {
        components.push(renderComponentDef(item.template, vars));
      }
      if ("children" in item) {
        findRepeats(item.children);
      }
    }
  }
  findRepeats(nodes);

  // Generate data arrays
  const dataArrays: string[] = [];
  function findDataArrays(items: (DslNode | RepeatBlock)[]) {
    for (const item of items) {
      if ("kind" in item && item.kind === "repeat") {
        const entries = item.data.map((d) => {
          const fields = Object.entries(d)
            .map(([k, v]) => {
              if (v.startsWith("$")) {
                const resolved = vars[v];
                return `${k}: ${resolved ?? `"${v}"`}`;
              }
              return `${k}: "${v}"`;
            })
            .join(", ");
          return `  { ${fields} }`;
        });
        dataArrays.push(`const ${item.arrayName} = [\n${entries.join(",\n")}\n];`);
      }
      if ("children" in item) {
        findDataArrays(item.children);
      }
    }
  }
  findDataArrays(nodes);

  // Generate main component
  const mainBody = nodes
    .map((node) => renderChild(node, 2, vars))
    .join("\n");

  const parts: string[] = [];

  // Component definitions
  if (components.length > 0) {
    parts.push(components.join("\n\n"));
  }

  // Data arrays
  if (dataArrays.length > 0) {
    parts.push(dataArrays.join("\n\n"));
  }

  // Main component
  parts.push(`export default function App() {\n  return (\n${mainBody}\n  );\n}`);

  return parts.join("\n\n");
}
