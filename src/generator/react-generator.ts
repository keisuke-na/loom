import type { FigmaNode } from "../api/figma-client.js";
import { resolveTag, collectStyles } from "../transformers/node.js";

function toCamelCase(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function formatStyleObject(styles: Record<string, string>): string {
  const entries = Object.entries(styles);
  if (entries.length === 0) return "";

  const props = entries
    .map(([key, value]) => `${toCamelCase(key)}: "${value}"`)
    .join(", ");

  return ` style={{ ${props} }}`;
}

function renderNode(node: FigmaNode, indent: number, imageMap: Record<string, string>): string {
  const pad = "  ".repeat(indent);
  const tag = resolveTag(node);
  const styles = collectStyles(node);
  const styleAttr = formatStyleObject(styles);

  // TEXT node
  if (node.type === "TEXT") {
    const text = node.characters ?? "";
    return `${pad}<${tag}${styleAttr}>\n${pad}  ${text}\n${pad}</${tag}>`;
  }

  // VECTOR node
  if (node.type === "VECTOR") {
    const src = imageMap[node.id] ?? "";
    return `${pad}<${tag} src="${src}"${styleAttr} alt="${node.name}" />`;
  }

  // container nodes (FRAME, RECTANGLE, INSTANCE, etc.)
  const children = node.children ?? [];
  if (children.length === 0) {
    return `${pad}<${tag}${styleAttr} />`;
  }

  const childrenCode = children
    .map((child) => renderNode(child, indent + 1, imageMap))
    .join("\n");

  return `${pad}<${tag}${styleAttr}>\n${childrenCode}\n${pad}</${tag}>`;
}

export function generateReact(node: FigmaNode, imageMap: Record<string, string> = {}): string {
  const jsx = renderNode(node, 2, imageMap);

  return `export default function Component() {
  return (
${jsx}
  );
}
`;
}
