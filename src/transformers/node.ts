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

export function isPassthroughNode(node: FigmaNode): boolean {
  if (node.type !== "FRAME") return false;
  if (!node.children || node.children.length !== 1) return false;
  if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) return false;
  if (node.itemSpacing) return false;
  if (node.cornerRadius || node.rectangleCornerRadii) return false;
  if (node.layoutSizingHorizontal === "FIXED") return false;
  if (node.layoutSizingVertical === "FIXED") return false;

  const hasBg = node.fills?.some((f) => f.type === "SOLID" && f.color && f.color.a > 0);
  if (hasBg) return false;

  const hasStroke = node.strokes?.some((s) => s.type === "SOLID" && s.color);
  if (hasStroke) return false;

  const hasEffect = node.effects?.some((e) => e.visible !== false);
  if (hasEffect) return false;

  return true;
}

export function flattenPassthroughNodes(node: FigmaNode): FigmaNode {
  const processedChildren = node.children?.map(flattenPassthroughNodes);
  const processed = { ...node, children: processedChildren };

  if (isPassthroughNode(processed) && processed.children?.length === 1) {
    const child = processed.children[0];
    return {
      ...child,
      layoutSizingHorizontal: child.layoutSizingHorizontal ?? processed.layoutSizingHorizontal,
      layoutSizingVertical: child.layoutSizingVertical ?? processed.layoutSizingVertical,
    };
  }

  return processed;
}

export function collectStyles(
  node: FigmaNode,
  parentLayoutMode?: "HORIZONTAL" | "VERTICAL"
): CSSProperties {
  if (node.type === "VECTOR") {
    return {};
  }

  return {
    ...transformLayout(node, parentLayoutMode),
    ...transformVisual(node),
    ...transformText(node),
  };
}
