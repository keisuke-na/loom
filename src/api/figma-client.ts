const FIGMA_API_BASE = "https://api.figma.com/v1";

function getToken(): string {
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    throw new Error("FIGMA_TOKEN environment variable is not set");
  }
  return token;
}

function headers(): Record<string, string> {
  return { "X-Figma-Token": getToken() };
}

export interface FigmaNodesResponse {
  name: string;
  lastModified: string;
  version: string;
  nodes: Record<string, { document: FigmaNode }>;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  // layout
  layoutMode?: "HORIZONTAL" | "VERTICAL";
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutSizingHorizontal?: "FILL" | "HUG" | "FIXED";
  layoutSizingVertical?: "FILL" | "HUG" | "FIXED";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  absoluteRenderBounds?: { x: number; y: number; width: number; height: number } | null;
  // visual
  fills?: FigmaFill[];
  strokes?: FigmaFill[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  effects?: FigmaEffect[];
  // text
  characters?: string;
  style?: FigmaTextStyle;
}

export interface FigmaFill {
  type: string;
  blendMode?: string;
  color?: { r: number; g: number; b: number; a: number };
}

export interface FigmaEffect {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
}

export interface FigmaTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlignHorizontal?: string;
  lineHeightPx?: number;
  letterSpacing?: number;
}

export interface FigmaImagesResponse {
  images: Record<string, string>;
}

export async function fetchNodes(
  fileKey: string,
  nodeId: string
): Promise<FigmaNodesResponse> {
  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<FigmaNodesResponse>;
}

export async function fetchImageUrl(
  fileKey: string,
  nodeId: string
): Promise<string | null> {
  const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=svg`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as FigmaImagesResponse;
  return data.images[nodeId] ?? null;
}

export async function fetchImageUrls(
  fileKey: string,
  nodeIds: string[]
): Promise<Record<string, string>> {
  if (nodeIds.length === 0) return {};

  const ids = nodeIds.map(encodeURIComponent).join(",");
  const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=svg`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as FigmaImagesResponse;
  return data.images;
}

function hasImageFill(node: FigmaNode): boolean {
  return node.fills?.some((f) => f.type === "IMAGE") ?? false;
}

export function collectImageNodeIds(node: FigmaNode): string[] {
  const ids: string[] = [];
  if (node.type === "VECTOR" || hasImageFill(node)) {
    ids.push(node.id);
  }
  for (const child of node.children ?? []) {
    ids.push(...collectImageNodeIds(child));
  }
  return ids;
}

export { hasImageFill };
