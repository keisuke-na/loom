import { readFileSync } from "fs";
import type { FigmaNodesResponse, FigmaNode } from "../src/api/figma-client.js";
import { resolveTag, collectStyles } from "../src/transformers/node.js";

function toCamelCase(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function formatStyleAttr(styles: Record<string, string>): string {
  const entries = Object.entries(styles);
  if (entries.length === 0) return "";
  const css = entries.map(([key, value]) => `${key}: ${value}`).join("; ");
  return ` style="${css}"`;
}

function renderNode(node: FigmaNode, indent: number): string {
  const pad = "  ".repeat(indent);
  const tag = resolveTag(node);
  const styles = collectStyles(node);
  const styleAttr = formatStyleAttr(styles);

  if (node.type === "TEXT") {
    const text = node.characters ?? "";
    return `${pad}<${tag}${styleAttr}>${text}</${tag}>`;
  }

  if (node.type === "VECTOR") {
    return `${pad}<${tag} src=""${styleAttr} alt="${node.name}" />`;
  }

  const children = node.children ?? [];
  if (children.length === 0) {
    return `${pad}<${tag}${styleAttr}></${tag}>`;
  }

  const childrenHtml = children
    .map((child) => renderNode(child, indent + 1))
    .join("\n");

  return `${pad}<${tag}${styleAttr}>\n${childrenHtml}\n${pad}</${tag}>`;
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/to-html.ts <input.json>");
  process.exit(1);
}

const json = JSON.parse(readFileSync(filePath, "utf-8")) as FigmaNodesResponse;
const nodeKey = Object.keys(json.nodes)[0];
if (!nodeKey) {
  console.error("No nodes found");
  process.exit(1);
}

const document = json.nodes[nodeKey].document;
const body = renderNode(document, 2);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loom Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;

console.log(html);
