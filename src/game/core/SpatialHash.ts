/** Anything stored in the grid needs a position and a radius. */
export interface GridItem {
  x: number;
  y: number;
  radius: number;
}

/**
 * Uniform grid rebuilt every step. Used for zombie crowding and any
 * "what is near this point" query (explosions, melee, pickups later).
 */
export class SpatialHash<T extends GridItem> {
  private cells = new Map<number, T[]>();
  private used: T[][] = [];
  private spare: T[][] = [];

  constructor(private readonly cellSize: number) {}

  private key(cx: number, cy: number) {
    // Offset so cells left/above the arena (queueing zombies) get unique keys.
    return (cx + 512) * 4096 + (cy + 512);
  }

  public clear() {
    for (const list of this.used) {
      list.length = 0;
      this.spare.push(list);
    }
    this.used.length = 0;
    this.cells.clear();
  }

  public insert(item: T) {
    const cx = Math.floor(item.x / this.cellSize);
    const cy = Math.floor(item.y / this.cellSize);
    const k = this.key(cx, cy);
    let list = this.cells.get(k);
    if (!list) {
      list = this.spare.pop() ?? [];
      this.cells.set(k, list);
      this.used.push(list);
    }
    list.push(item);
  }

  /** Calls fn for every item in cells overlapping the square around (x, y). */
  public query(x: number, y: number, radius: number, fn: (item: T) => void) {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const list = this.cells.get(this.key(cx, cy));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) fn(list[i]);
      }
    }
  }
}
