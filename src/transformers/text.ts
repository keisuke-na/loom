import type { FigmaNode } from "../api/figma-client.js";
import type { CSSProperties } from "./layout.js";

const TEXT_ALIGN_MAP: Record<string, string> = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  JUSTIFIED: "justify",
};

export function transformText(node: FigmaNode): CSSProperties {
  const css: CSSProperties = {};
  const s = node.style;

  if (!s) {
    return css;
  }

  if (s.fontFamily) css["font-family"] = s.fontFamily;
  if (s.fontSize) css["font-size"] = `${s.fontSize}px`;
  if (s.fontWeight) css["font-weight"] = `${s.fontWeight}`;
  if (s.lineHeightPx) css["line-height"] = `${s.lineHeightPx}px`;
  if (s.letterSpacing) css["letter-spacing"] = `${s.letterSpacing}px`;

  if (s.textAlignHorizontal) {
    const value = TEXT_ALIGN_MAP[s.textAlignHorizontal];
    if (value) css["text-align"] = value;
  }

  return css;
}
