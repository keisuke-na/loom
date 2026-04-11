import type { FigmaNode } from "../api/figma-client.js";
import { type CSSProperties, transformLayout } from "./layout.js";
import { transformVisual } from "./visual.js";
import { transformText } from "./text.js";

export type HtmlTag = "div" | "span" | "img";

export function resolveTag(node: FigmaNode): HtmlTag {
  switch (node.type) {
    case "TEXT":
      return "span";
    case "VECTOR":
      return "img";
    default:
      return "div";
  }
}

export function collectStyles(node: FigmaNode): CSSProperties {
  return {
    ...transformLayout(node),
    ...transformVisual(node),
    ...transformText(node),
  };
}
