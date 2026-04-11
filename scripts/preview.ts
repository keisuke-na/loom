import { readFileSync, existsSync } from "fs";
import type { FigmaNodesResponse } from "../src/api/figma-client.js";
import { collectImageNodeIds, fetchImageUrls } from "../src/api/figma-client.js";
import { generateReact } from "../src/generator/react-generator.js";

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const fileKey = args
  .find((a) => a.startsWith("--file-key="))
  ?.split("=")[1];
const imageCachePath = args
  .find((a) => a.startsWith("--image-cache="))
  ?.split("=")[1];

if (!filePath) {
  console.error("Usage: npx tsx scripts/preview.ts <input.json> [--file-key=FILE_KEY] [--image-cache=CACHE.json]");
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
    const imageIds = collectImageNodeIds(document);
    if (imageIds.length > 0) {
      console.error(`Fetching ${imageIds.length} images...`);
      imageMap = await fetchImageUrls(fileKey, imageIds);
    }
  }

  const reactCode = generateReact(document, imageMap);

  // Remove "export default " for browser usage
  const browserCode = reactCode.replace("export default ", "");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loom Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${browserCode}
ReactDOM.createRoot(document.getElementById("root")).render(<Component />);
  <\/script>
</body>
</html>
`;

  console.log(html);
}

main();
