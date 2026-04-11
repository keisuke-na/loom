import type { FigmaNode } from "../api/figma-client.js";
import type { CSSProperties } from "./layout.js";

function toRgba(color: { r: number; g: number; b: number; a: number }): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${color.a})`;
}

export function transformVisual(node: FigmaNode): CSSProperties {
  const css: CSSProperties = {};

  // fills: TEXT nodes use "color", others use "background-color"
  const fill = node.fills?.find((f) => f.type === "SOLID" && f.color);
  if (fill?.color) {
    const prop = node.type === "TEXT" ? "color" : "background-color";
    css[prop] = toRgba(fill.color);
  }

  // border-radius
  if (node.cornerRadius) {
    css["border-radius"] = `${node.cornerRadius}px`;
  }

  // border
  const stroke = node.strokes?.find((s) => s.type === "SOLID" && s.color);
  if (stroke?.color && node.strokeWeight) {
    css["border"] = `${node.strokeWeight}px solid ${toRgba(stroke.color)}`;
  }

  // box-shadow
  const shadow = node.effects?.find(
    (e) => e.type === "DROP_SHADOW" && e.visible !== false && e.color
  );
  if (shadow?.color) {
    const x = shadow.offset?.x ?? 0;
    const y = shadow.offset?.y ?? 0;
    const r = shadow.radius ?? 0;
    const spread = shadow.spread ?? 0;
    css["box-shadow"] = `${x}px ${y}px ${r}px ${spread}px ${toRgba(shadow.color)}`;
  }

  return css;
}
