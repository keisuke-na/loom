import { readFileSync, writeFileSync, existsSync } from "fs";
import type { FigmaNodesResponse, FigmaNode } from "../src/api/figma-client.js";
import { collectVectorNodeIds, fetchImageUrls } from "../src/api/figma-client.js";
import { resolveTag, collectStyles } from "../src/transformers/node.js";

function formatStyleAttr(styles: Record<string, string>): string {
  const entries = Object.entries(styles);
  if (entries.length === 0) return "";
  const css = entries.map(([key, value]) => `${key}: ${value}`).join("; ");
  return ` style="${css}"`;
}

function renderNode(node: FigmaNode, indent: number, imageMap: Record<string, string>): string {
  const pad = "  ".repeat(indent);
  const tag = resolveTag(node);
  const styles = collectStyles(node);
  const styleAttr = formatStyleAttr(styles);

  if (node.type === "TEXT") {
    const text = node.characters ?? "";
    return `${pad}<${tag}${styleAttr}>${text}</${tag}>`;
  }

  if (node.type === "VECTOR") {
    const src = imageMap[node.id] ?? "";
    return `${pad}<${tag} src="${src}"${styleAttr} alt="${node.name}" />`;
  }

  const children = node.children ?? [];
  if (children.length === 0) {
    return `${pad}<${tag}${styleAttr}></${tag}>`;
  }

  const childrenHtml = children
    .map((child) => renderNode(child, indent + 1, imageMap))
    .join("\n");

  return `${pad}<${tag}${styleAttr}>\n${childrenHtml}\n${pad}</${tag}>`;
}

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const fileKey = args
  .find((a) => a.startsWith("--file-key="))
  ?.split("=")[1];
const imageCachePath = args
  .find((a) => a.startsWith("--image-cache="))
  ?.split("=")[1];

if (!filePath) {
  console.error("Usage: npx tsx scripts/to-html.ts <input.json> [--file-key=FILE_KEY] [--image-cache=CACHE.json]");
  process.exit(1);
}

const json = JSON.parse(readFileSync(filePath, "utf-8")) as FigmaNodesResponse;
const nodeKey = Object.keys(json.nodes)[0];
if (!nodeKey) {
  console.error("No nodes found");
  process.exit(1);
}

const document = json.nodes[nodeKey].document;

async function main() {
  let imageMap: Record<string, string> = {};

  if (imageCachePath && existsSync(imageCachePath)) {
    imageMap = JSON.parse(readFileSync(imageCachePath, "utf-8"));
    console.error(`Loaded ${Object.keys(imageMap).length} images from cache`);
  } else if (fileKey) {
    const vectorIds = collectVectorNodeIds(document);
    if (vectorIds.length > 0) {
      console.error(`Fetching ${vectorIds.length} SVG images...`);
      imageMap = await fetchImageUrls(fileKey, vectorIds);
      if (imageCachePath) {
        writeFileSync(imageCachePath, JSON.stringify(imageMap, null, 2));
        console.error(`Saved image cache to ${imageCachePath}`);
      }
    }
  }

  const body = renderNode(document, 2, imageMap);

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
}

main();
