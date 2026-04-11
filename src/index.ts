#!/usr/bin/env node

import { readFileSync } from "fs";
import type { FigmaNodesResponse } from "./api/figma-client.js";
import { generateReact } from "./generator/react-generator.js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: loom <input.json>");
  process.exit(1);
}

const json = JSON.parse(readFileSync(filePath, "utf-8")) as FigmaNodesResponse;

const nodeKey = Object.keys(json.nodes)[0];
if (!nodeKey) {
  console.error("No nodes found in the input file");
  process.exit(1);
}

const document = json.nodes[nodeKey].document;
const code = generateReact(document);

console.log(code);
