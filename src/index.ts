#!/usr/bin/env node

import { readFileSync } from "fs";
import type { FigmaNodesResponse } from "./api/figma-client.js";
import { collectVectorNodeIds, fetchImageUrls } from "./api/figma-client.js";
import { generateReact } from "./generator/react-generator.js";

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const fileKey = args
  .find((a) => a.startsWith("--file-key="))
  ?.split("=")[1];

if (!filePath) {
  console.error("Usage: loom <input.json> [--file-key=FILE_KEY]");
  process.exit(1);
}

const json = JSON.parse(readFileSync(filePath, "utf-8")) as FigmaNodesResponse;

const nodeKey = Object.keys(json.nodes)[0];
if (!nodeKey) {
  console.error("No nodes found in the input file");
  process.exit(1);
}

const document = json.nodes[nodeKey].document;

async function main() {
  let imageMap: Record<string, string> = {};

  if (fileKey) {
    const vectorIds = collectVectorNodeIds(document);
    if (vectorIds.length > 0) {
      console.error(`Fetching ${vectorIds.length} SVG images...`);
      imageMap = await fetchImageUrls(fileKey, vectorIds);
    }
  }

  const code = generateReact(document, imageMap);
  console.log(code);
}

main();
