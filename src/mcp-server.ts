#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { collectImageNodeIds, fetchImageUrls, fetchNodes } from "./api/figma-client.js";
import { generateDsl } from "./generator/dsl-generator.js";
import { parseDsl, parseVariableDefinitions } from "./parser/dsl-parser.js";
import { generateComponentMap } from "./generator/semantic-react-generator.js";
import { flattenPassthroughNodes } from "./transformers/node.js";

let cachedVars: Record<string, string> = {};
let cachedComponents: Record<string, string> = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const semanticPrompt = readFileSync(join(__dirname, "../prompts/dsl-to-semantic.md"), "utf-8");

function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/design\/([^/]+)/);
  if (!match) throw new Error("Invalid Figma URL: could not extract file key");
  const nodeIdRaw = parsed.searchParams.get("node-id");
  if (!nodeIdRaw) throw new Error("Invalid Figma URL: missing node-id parameter");
  return { fileKey: match[1], nodeId: nodeIdRaw.replace("-", ":") };
}

const server = new McpServer(
  { name: "loom", version: "0.0.1" },
  {
    instructions: [
      "## Workflow",
      "1. generate-dsl: Convert Figma URL to DSL body",
      "2. Annotate the DSL with .as, .tag, .repeat following the Semantic Annotation Rules below",
      "3. generate-react: Pass annotated DSL to generate React components (cached server-side)",
      "4. list-components / get-component: Retrieve individual components",
      "",
      "## Semantic Annotation Rules",
      semanticPrompt,
    ].join("\n"),
  },
);

server.tool(
  "generate-dsl",
  "Convert a Figma component to compact DSL. Returns DSL body and semantic annotation rules. Annotate the DSL with .as, .tag, .repeat following the rules, then pass the result to generate-react.",
  {
    figmaUrl: z.string().describe("Figma component URL (e.g. https://www.figma.com/design/FILE_KEY/Name?node-id=1-2)"),
  },
  async ({ figmaUrl }) => {
    const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
    const json = await fetchNodes(fileKey, nodeId);
    const nodeKey = Object.keys(json.nodes)[0];
    if (!nodeKey) {
      return { content: [{ type: "text", text: "Error: No nodes found for the given node-id" }] };
    }

    const document = flattenPassthroughNodes(json.nodes[nodeKey].document);

    let imageMap: Record<string, string> = {};
    const imageIds = collectImageNodeIds(document);
    if (imageIds.length > 0) {
      imageMap = await fetchImageUrls(fileKey, imageIds);
    }

    const fullDsl = generateDsl(document, imageMap, false);
    const bodyDsl = generateDsl(document, imageMap, true);
    const varsText = fullDsl.slice(0, fullDsl.length - bodyDsl.length).trim();
    cachedVars = parseVariableDefinitions(varsText);

    return { content: [{ type: "text", text: bodyDsl }] };
  }
);

server.tool(
  "generate-react",
  "Convert semantic DSL to React components and cache them server-side. Use list-components and get-component to retrieve individual components.",
  {
    semanticDsl: z.string().describe("Semantic DSL string (with .as, .tag, .repeat annotations)"),
  },
  async ({ semanticDsl }) => {
    const nodes = parseDsl(semanticDsl);
    cachedComponents = generateComponentMap(nodes, cachedVars);
    const names = Object.keys(cachedComponents);
    return { content: [{ type: "text", text: `Generated ${names.length} components: ${names.join(", ")}` }] };
  }
);

server.tool(
  "list-components",
  "List all cached component names from the previous generate-react call.",
  {},
  async () => {
    const names = Object.keys(cachedComponents);
    if (names.length === 0) {
      return { content: [{ type: "text", text: "No components cached. Run generate-react first." }] };
    }
    return { content: [{ type: "text", text: names.join("\n") }] };
  }
);

server.tool(
  "get-component",
  "Get the code for a specific cached component. This code is pixel-perfect — use it as-is or transform it (e.g. to Tailwind CSS).",
  {
    name: z.string().describe("Component name (e.g. Header, PodcastCard, App)"),
  },
  async ({ name }) => {
    const code = cachedComponents[name];
    if (!code) {
      const available = Object.keys(cachedComponents);
      return { content: [{ type: "text", text: `Component "${name}" not found. Available: ${available.join(", ")}` }] };
    }
    return { content: [{ type: "text", text: code }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
