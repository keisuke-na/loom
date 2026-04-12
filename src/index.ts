#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import type { FigmaNodesResponse } from "./api/figma-client.js";
import { collectImageNodeIds, fetchImageUrls } from "./api/figma-client.js";
import { generateReact } from "./generator/react-generator.js";
import { generateDsl } from "./generator/dsl-generator.js";

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const fileKey = args
  .find((a) => a.startsWith("--file-key="))
  ?.split("=")[1];
const imageCachePath = args
  .find((a) => a.startsWith("--image-cache="))
  ?.split("=")[1];
const format = args
  .find((a) => a.startsWith("--format="))
  ?.split("=")[1] ?? "react";
const bodyOnly = args.includes("--body-only");

if (!filePath) {
  console.error("Usage: loom <input.json> [--file-key=FILE_KEY] [--image-cache=CACHE.json]");
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

  if (imageCachePath && existsSync(imageCachePath)) {
    imageMap = JSON.parse(readFileSync(imageCachePath, "utf-8"));
    console.error(`Loaded ${Object.keys(imageMap).length} images from cache`);
  } else if (fileKey) {
    const imageIds = collectImageNodeIds(document);
    if (imageIds.length > 0) {
      console.error(`Fetching ${imageIds.length} images...`);
      imageMap = await fetchImageUrls(fileKey, imageIds);
      if (imageCachePath) {
        writeFileSync(imageCachePath, JSON.stringify(imageMap, null, 2));
        console.error(`Saved image cache to ${imageCachePath}`);
      }
    }
  }

  const code = format === "dsl"
    ? generateDsl(document, imageMap, bodyOnly)
    : generateReact(document, imageMap);
  console.log(code);
}

main();
