import { Graphics } from "pixi.js";

/**
 * Vector icons for power-ups. Each draws centred on (0,0) into `size` px,
 * so the same art works for pickups on the floor and the HUD timers.
 */

/** Red TNT crate with a lit fuse. */
export function drawTntCrate(g = new Graphics(), size = 34): Graphics {
  const h = size / 2;
  const k = size / 34;
  g.roundRect(-h, -h, size, size, 4 * k)
    .fill(0x7a4a22)
    .stroke({ width: 2 * k, color: 0x2a170a });
  // Planks and cross brace.
  g.rect(-h + 3 * k, -h + 3 * k, size - 6 * k, size - 6 * k).fill(0x9c6230);
  g.moveTo(-h + 4 * k, -h + 4 * k)
    .lineTo(h - 4 * k, h - 4 * k)
    .stroke({ width: 4 * k, color: 0x6b3f1b });
  // Red band with the label.
  g.rect(-h, -6 * k, size, 12 * k).fill(0xd8261f);
  g.rect(-h, -6 * k, size, 2 * k).fill(0xff6a50);
  // "TNT" in blocky strokes.
  const s = { width: 2.2 * k, color: 0xffffff };
  const t = (x: number) =>
    g
      .moveTo(x - 3 * k, -3 * k)
      .lineTo(x + 3 * k, -3 * k)
      .moveTo(x, -3 * k)
      .lineTo(x, 4 * k)
      .stroke(s);
  t(-8 * k);
  t(8 * k);
  g.moveTo(-3 * k, 4 * k)
    .lineTo(-3 * k, -3 * k)
    .lineTo(3 * k, 4 * k)
    .lineTo(3 * k, -3 * k)
    .stroke(s);
  // Fuse and spark.
  g.moveTo(h - 6 * k, -h)
    .quadraticCurveTo(h, -h - 6 * k, h + 3 * k, -h - 3 * k)
    .stroke({ width: 2 * k, color: 0x2b2b2b });
  g.circle(h + 3 * k, -h - 3 * k, 3 * k).fill(0xffd34a);
  g.circle(h + 3 * k, -h - 3 * k, 1.5 * k).fill(0xffffff);
  return g;
}

/** Cyan bubble with a hex crest. */
export function drawShieldIcon(g = new Graphics(), size = 34): Graphics {
  const r = size / 2;
  g.circle(0, 0, r).fill({ color: 0x0b3a4a, alpha: 0.9 });
  g.circle(0, 0, r - 1).stroke({ width: 2.5, color: 0x6ff3ff });
  const hr = r * 0.55;
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push(Math.cos(a) * hr, Math.sin(a) * hr);
  }
  g.poly(pts).fill({ color: 0x6ff3ff, alpha: 0.35 }).stroke({
    width: 2,
    color: 0xc8fbff,
  });
  g.arc(0, 0, r * 0.75, -2.6, -1.6).stroke({
    width: 2,
    color: 0xffffff,
    alpha: 0.8,
  });
  return g;
}

/** Magenta/cyan lightning bolt. */
export function drawTurboIcon(g = new Graphics(), size = 34): Graphics {
  const r = size / 2;
  const k = size / 34;
  g.circle(0, 0, r).fill({ color: 0x2a0b3a, alpha: 0.9 });
  g.circle(0, 0, r - 1).stroke({ width: 2.5, color: 0xff5cf0 });
  g.poly([
    3 * k,
    -12 * k,
    -7 * k,
    2 * k,
    -1 * k,
    2 * k,
    -4 * k,
    12 * k,
    7 * k,
    -3 * k,
    1 * k,
    -3 * k,
  ])
    .fill(0x7ff6ff)
    .stroke({ width: 1.5 * k, color: 0xffffff });
  return g;
}
