import type { TextStyleOptions } from "pixi.js";

/** Shared look for the game's menus: the same chunky type and colours as the HUD. */
export const FONT = "Arial Black, Arial, sans-serif";

export const COLORS = {
  bg: 0x0b0b0c,
  panel: 0x141513,
  panelEdge: 0x2b3a1f,
  slime: 0x9dff4a,
  slimeDark: 0x1d3a0a,
  blood: 0xff4a4a,
  bloodDark: 0x3a0a0a,
  text: 0xf2f2ee,
  muted: 0x9a9a92,
  gold: 0xffe08a,
};

export function textStyle(
  size: number,
  fill: number,
  extra: Partial<TextStyleOptions> = {},
): Partial<TextStyleOptions> {
  return {
    fontFamily: FONT,
    fontSize: size,
    fill,
    align: "center",
    stroke: { color: 0x000000, width: Math.max(2, Math.round(size / 7)) },
    ...extra,
  };
}

/** Same clamp the HUD uses, so menus and HUD scale together on small embeds. */
export function uiScale(w: number, h: number) {
  return Math.max(0.55, Math.min(1.25, Math.min(w / 1280, h / 800)));
}

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}
