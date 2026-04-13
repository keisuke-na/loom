export interface DslNode {
  tag: "F" | "T" | "I";
  modifiers: string;
  as?: string;
  htmlTag?: string;
  repeat?: number;
  text?: string;
  children: DslNode[];
}


interface ParsedLine {
  indent: number;
  raw: string;
}

function extractAnnotation(line: string, name: string): { value: string | undefined; rest: string } {
  const regex = new RegExp(`\\.${name}\\((?:"([^"]*)"|(\\d+))\\)`);
  const match = line.match(regex);
  if (match) {
    return { value: match[1] ?? match[2], rest: line.replace(match[0], "") };
  }
  return { value: undefined, rest: line };
}

function extractText(line: string): { text: string | undefined; rest: string } {
  // Match @prop("name") at end of line (template variable)
  const propMatch = line.match(/\s+@prop\("([^"]*)"\)$/);
  if (propMatch) {
    return { text: propMatch[0].trim(), rest: line.slice(0, line.length - propMatch[0].length) };
  }
  // Match "text" at end of line (literal text)
  const match = line.match(/\s+"([^"]*)"$/);
  if (match) {
    return { text: match[1], rest: line.slice(0, line.length - match[0].length) };
  }
  return { text: undefined, rest: line };
}

function parseSingleLine(raw: string): DslNode {
  let line = raw.trim();

  // Remove trailing >
  const hasChildren = line.endsWith(">");
  if (hasChildren) {
    line = line.slice(0, -1).trimEnd();
  }

  // Extract .as(), .tag(), and .repeat()
  const { value: as, rest: afterAs } = extractAnnotation(line, "as");
  const { value: htmlTag, rest: afterTag } = extractAnnotation(afterAs, "tag");
  const { value: repeatStr, rest: afterRepeat } = extractAnnotation(afterTag, "repeat");
  const repeat = repeatStr ? parseInt(repeatStr) : undefined;

  // Extract text content (for T nodes)
  const { text, rest: afterText } = extractText(afterRepeat.trim());

  // Extract tag (F, T, I)
  const tag = afterText.trim()[0] as "F" | "T" | "I";

  // Everything after the tag is modifiers (including $variables and .modifiers)
  const modifiers = afterText.trim().slice(1).trim();

  return {
    tag,
    modifiers,
    as,
    htmlTag,
    repeat,
    text,
    children: [],
  };
}

function buildTree(lines: ParsedLine[], startIdx: number, parentIndent: number): { nodes: DslNode[]; endIdx: number } {
  const nodes: DslNode[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const { indent, raw } = lines[i];

    // If we've gone back to parent level or above, stop
    if (indent <= parentIndent && i > startIdx) {
      break;
    }

    // Regular node
    const node = parseSingleLine(raw);
    const currentIndent = indent;

    // Parse children if has >
    if (raw.trim().endsWith(">") || raw.trim().replace(/\.as\("[^"]*"\)/, "").replace(/\.tag\("[^"]*"\)/, "").replace(/\.repeat\(\d+\)/, "").trimEnd().endsWith(">")) {
      const { nodes: children, endIdx: childEnd } = buildTree(lines, i + 1, currentIndent);
      node.children = children;
      i = childEnd;
    } else {
      i++;
    }

    nodes.push(node);
  }

  return { nodes, endIdx: i };
}

const VOID_ELEMENTS = new Set(["input", "img", "br", "hr", "meta", "link"]);

export function sanitizeSemanticDsl(input: string): string {
  return input
    .split("\n")
    .map((line) => {
      const tagMatch = line.match(/\.tag\("([^"]*)"\)/);
      if (tagMatch && VOID_ELEMENTS.has(tagMatch[1]) && tagMatch[1] !== "input" && line.trimEnd().endsWith(">")) {
        return line.replace(tagMatch[0], "");
      }
      return line;
    })
    .join("\n");
}

export function parseDsl(input: string): DslNode[] {
  const sanitized = sanitizeSemanticDsl(input);
  const rawLines = sanitized.split("\n").filter((l) => l.trim() !== "");
  const lines: ParsedLine[] = rawLines.map((raw) => ({
    indent: raw.match(/^( *)/)?.[0].length ?? 0,
    raw,
  }));

  const { nodes } = buildTree(lines, 0, -1);
  return nodes;
}

export function parseVariableDefinitions(input: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of input.split("\n")) {
    const match = line.match(/^(\$\w+)\s*=\s*(.+)$/);
    if (match) {
      vars[match[1]] = match[2].trim();
    }
  }
  return vars;
}
