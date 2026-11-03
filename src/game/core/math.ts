import { GATES, INNER } from "../config";

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));

export const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];

/** Frame-rate independent exponential decay towards zero. */
export const damp = (value: number, rate: number, dt: number) =>
  value * Math.exp(-rate * dt);

/**
 * Distance along a normalised ray (o + d * t) to the first intersection with a circle.
 * Returns -1 when the ray misses or the circle is behind the origin.
 */
export function rayCircle(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  r: number,
): number {
  const mx = cx - ox;
  const my = cy - oy;
  const along = mx * dx + my * dy;
  if (along < -r) return -1;
  const perpSq = mx * mx + my * my - along * along;
  const rSq = r * r;
  if (perpSq > rSq) return -1;
  const half = Math.sqrt(rSq - perpSq);
  const t = along - half;
  return t >= 0 ? t : along + half >= 0 ? 0 : -1;
}

/**
 * How far a shot from inside the arena travels before a wall stops it.
 * Shots that leave through a gate opening keep going (they can hit zombies queueing outside).
 */
export function rayWallDistance(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  range: number,
): number {
  const tx =
    dx > 0
      ? (INNER.right - ox) / dx
      : dx < 0
        ? (INNER.left - ox) / dx
        : Infinity;
  const ty =
    dy > 0
      ? (INNER.bottom - oy) / dy
      : dy < 0
        ? (INNER.top - oy) / dy
        : Infinity;
  if (ty <= tx) return Math.min(ty, range);
  // Leaves through a side wall: is that point inside a gate opening?
  const y = oy + dy * tx;
  const side = dx > 0 ? "right" : "left";
  for (const gate of GATES) {
    if (gate.side === side && y > gate.y0 && y < gate.y1) return range;
  }
  return Math.min(tx, range);
}
