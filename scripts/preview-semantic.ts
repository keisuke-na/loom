import { readFileSync } from "fs";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/preview-semantic.ts <generated.tsx>");
  process.exit(1);
}

let code = readFileSync(filePath, "utf-8");

// Strip import React
code = code.replace(/^import React from "react";\n*/m, "");

// Strip TypeScript type annotations from function params
// e.g., { a, b }: { a: string; b: string } → { a, b }
code = code.replace(/\}: \{[^}]+\}/g, "}");

// Strip "export default "
code = code.replace("export default ", "");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loom Semantic Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Spline+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    button { background: none; border: none; cursor: pointer; font: inherit; color: inherit; }
    input { background: none; border: none; outline: none; font: inherit; color: inherit; width: 100%; }
    input::placeholder { color: inherit; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${code}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  <\/script>
</body>
</html>
`;

console.log(html);
