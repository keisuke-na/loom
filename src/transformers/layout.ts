import type { FigmaNode } from "../api/figma-client.js";

export type CSSProperties = Record<string, string>;

const ALIGN_MAP: Record<string, string> = {
  MIN: "flex-start",
  CENTER: "center",
  MAX: "flex-end",
  SPACE_BETWEEN: "space-between",
};

export function transformLayout(node: FigmaNode): CSSProperties {
  const css: CSSProperties = {};

  if (!node.layoutMode) {
    return css;
  }

  css["display"] = "flex";
  css["flex-direction"] = node.layoutMode === "VERTICAL" ? "column" : "row";

  // padding
  if (node.paddingTop) css["padding-top"] = `${node.paddingTop}px`;
  if (node.paddingRight) css["padding-right"] = `${node.paddingRight}px`;
  if (node.paddingBottom) css["padding-bottom"] = `${node.paddingBottom}px`;
  if (node.paddingLeft) css["padding-left"] = `${node.paddingLeft}px`;

  // gap
  if (node.itemSpacing) css["gap"] = `${node.itemSpacing}px`;

  // sizing
  if (node.layoutSizingHorizontal === "FILL") css["flex"] = "1";
  if (node.layoutSizingHorizontal === "HUG") css["width"] = "fit-content";
  if (node.layoutSizingHorizontal === "FIXED" && node.absoluteBoundingBox) {
    css["width"] = `${node.absoluteBoundingBox.width}px`;
  }

  if (node.layoutSizingVertical === "FILL") css["flex"] = "1";
  if (node.layoutSizingVertical === "HUG") css["height"] = "fit-content";
  if (node.layoutSizingVertical === "FIXED" && node.absoluteBoundingBox) {
    css["height"] = `${node.absoluteBoundingBox.height}px`;
  }

  // alignment
  if (node.primaryAxisAlignItems) {
    const value = ALIGN_MAP[node.primaryAxisAlignItems];
    if (value) css["justify-content"] = value;
  }

  if (node.counterAxisAlignItems) {
    const value = ALIGN_MAP[node.counterAxisAlignItems];
    if (value) css["align-items"] = value;
  }

  return css;
}
