export interface DslNode {
  tag: "F" | "T" | "I";
  modifiers: string;
  as?: string;
  htmlTag?: string;
  text?: string;
  children: (DslNode | RepeatBlock)[];
}

export interface RepeatBlock {
  kind: "repeat";
  arrayName: string;
  count: number;
  template: DslNode;
  data: Record<string, string>[];
}

interface ParsedLine {
  indent: number;
  raw: string;
}

function extractAnnotation(line: string, name: string): { value: string | undefined; rest: string } {
  const regex = new RegExp(`\\.${name}\\("([^"]*)"\\)`);
  const match = line.match(regex);
  if (match) {
    return { value: match[1], rest: line.replace(match[0], "") };
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

  // Extract .as() and .tag()
  const { value: as, rest: afterAs } = extractAnnotation(line, "as");
  const { value: htmlTag, rest: afterTag } = extractAnnotation(afterAs, "tag");

  // Extract text content (for T nodes)
  const { text, rest: afterText } = extractText(afterTag.trim());

  // Extract tag (F, T, I)
  const tag = afterText.trim()[0] as "F" | "T" | "I";

  // Everything after the tag is modifiers (including $variables and .modifiers)
  const modifiers = afterText.trim().slice(1).trim();

  return {
    tag,
    modifiers,
    as,
    htmlTag,
    text,
    children: [],
  };
}

function parseDataSection(lines: ParsedLine[], startIdx: number): { data: Record<string, string>[]; endIdx: number } {
  const data: Record<string, string>[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i].raw.trim();
    if (line === "@end") {
      return { data, endIdx: i };
    }
    // Parse { key: "value", key2: "value2", ... } or { key: $var, ... }
    if (line.startsWith("{")) {
      const entry: Record<string, string> = {};
      const content = line.slice(1, -1).trim();
      // Match key: "value" or key: $var patterns
      const propRegex = /(\w+):\s*(?:"([^"]*)"|(\$\w+))/g;
      let match;
      while ((match = propRegex.exec(content)) !== null) {
        entry[match[1]] = match[2] ?? match[3];
      }
      data.push(entry);
    }
    i++;
  }

  return { data, endIdx: i };
}

function buildTree(lines: ParsedLine[], startIdx: number, parentIndent: number): { nodes: (DslNode | RepeatBlock)[]; endIdx: number } {
  const nodes: (DslNode | RepeatBlock)[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const { indent, raw } = lines[i];
    const trimmed = raw.trim();

    // If we've gone back to parent level or above, stop
    if (indent <= parentIndent && i > startIdx) {
      break;
    }

    // Handle @repeat
    if (trimmed.startsWith("@repeat")) {
      const match = trimmed.match(/@repeat\("([^"]*)",\s*(\d+)\)/);
      if (match) {
        const arrayName = match[1];
        const count = parseInt(match[2]);

        // Next line is the template
        i++;
        const templateNode = parseSingleLine(lines[i].raw);
        const templateIndent = lines[i].indent;

        // Parse template children
        const { nodes: templateChildren, endIdx: childEnd } = buildTree(lines, i + 1, templateIndent);
        templateNode.children = templateChildren;
        i = childEnd;

        // Find @data section
        while (i < lines.length && lines[i].raw.trim() !== "@data") {
          i++;
        }
        i++; // skip @data line

        // Parse data entries
        const { data, endIdx: dataEnd } = parseDataSection(lines, i);
        i = dataEnd + 1; // skip @end

        nodes.push({
          kind: "repeat",
          arrayName,
          count,
          template: templateNode,
          data,
        });
        continue;
      }
    }

    // Handle @data and @end (shouldn't reach here in normal flow)
    if (trimmed === "@data" || trimmed === "@end") {
      break;
    }

    // Regular node
    const node = parseSingleLine(raw);
    const currentIndent = indent;

    // Parse children if has >
    if (raw.trim().endsWith(">") || raw.trim().replace(/\.as\("[^"]*"\)/, "").replace(/\.tag\("[^"]*"\)/, "").trimEnd().endsWith(">")) {
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

export function parseDsl(input: string): (DslNode | RepeatBlock)[] {
  const rawLines = input.split("\n").filter((l) => l.trim() !== "");
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
