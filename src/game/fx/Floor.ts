import type { Renderer, Texture } from "pixi.js";
import { Container, Graphics, RenderTexture, Sprite } from "pixi.js";

import { ARENA, GATES, INNER } from "../config";
import { rand } from "../core/math";

/**
 * The arena floor is one render texture the size of the arena.
 * Splats, corpses, casings and footprints are stamped into it and their sprites
 * are recycled straight away, so the mess builds up forever at a fixed cost.
 */
export class Floor {
  public readonly view: Sprite;
  private readonly rt: RenderTexture;
  private readonly batch = new Container();
  private readonly pool: Sprite[] = [];
  /** Total stamps baked so far (handy for tests and stats). */
  public stampCount = 0;

  constructor(private readonly renderer: Renderer) {
    this.rt = RenderTexture.create({
      width: ARENA.width,
      height: ARENA.height,
      resolution: 1,
      antialias: false,
    });
    this.view = new Sprite(this.rt);
  }

  /** Clear the mess and redraw the clean concrete floor. */
  public reset() {
    const g = new Graphics();
    g.rect(0, 0, ARENA.width, ARENA.height).fill(0x34312d);
    // Concrete slabs.
    const slab = 160;
    for (let x = 0; x < ARENA.width; x += slab) {
      for (let y = 0; y < ARENA.height; y += slab) {
        const v = Math.round(rand(-6, 6));
        const c = (0x3a + v) * 0x10000 + (0x37 + v) * 0x100 + (0x32 + v);
        g.rect(x + 1, y + 1, slab - 2, slab - 2).fill(c);
      }
    }
    // Grit.
    for (let i = 0; i < 2500; i++) {
      const a = rand(0.04, 0.12);
      g.circle(
        rand(0, ARENA.width),
        rand(0, ARENA.height),
        rand(0.5, 2.2),
      ).fill({
        color: Math.random() < 0.5 ? 0x000000 : 0xffffff,
        alpha: a,
      });
    }
    // Old stains so it never looks brand new.
    for (let i = 0; i < 18; i++) {
      g.ellipse(
        rand(0, ARENA.width),
        rand(0, ARENA.height),
        rand(30, 120),
        rand(20, 80),
      ).fill({
        color: 0x000000,
        alpha: rand(0.04, 0.1),
      });
    }
    // Walls with gate openings.
    const wallColor = 0x1b1a19;
    const capColor = 0x4a4642;
    g.rect(0, 0, ARENA.width, INNER.top).fill(wallColor);
    g.rect(0, INNER.bottom, ARENA.width, ARENA.height - INNER.bottom).fill(
      wallColor,
    );
    for (const side of ["left", "right"] as const) {
      const x = side === "left" ? 0 : INNER.right;
      const gates = GATES.filter((gate) => gate.side === side).sort(
        (a, b) => a.y0 - b.y0,
      );
      let y = 0;
      for (const gate of gates) {
        g.rect(x, y, ARENA.wall, gate.y0 - y).fill(wallColor);
        y = gate.y1;
      }
      g.rect(x, y, ARENA.wall, ARENA.height - y).fill(wallColor);
    }
    // Wall caps (inner edge highlight).
    g.rect(INNER.left, INNER.top - 4, INNER.right - INNER.left, 4).fill(
      capColor,
    );
    g.rect(INNER.left, INNER.bottom, INNER.right - INNER.left, 4).fill(
      capColor,
    );
    for (const side of ["left", "right"] as const) {
      const x = side === "left" ? INNER.left - 4 : INNER.right;
      const gates = GATES.filter((gate) => gate.side === side).sort(
        (a, b) => a.y0 - b.y0,
      );
      let y: number = INNER.top;
      for (const gate of gates) {
        g.rect(x, y, 4, gate.y0 - y).fill(capColor);
        // Hazard stripes on the gate threshold.
        for (let sy = gate.y0; sy < gate.y1; sy += 16) {
          g.rect(side === "left" ? 0 : INNER.right, sy, ARENA.wall, 8).fill({
            color: 0xc9a227,
            alpha: 0.35,
          });
        }
        y = gate.y1;
      }
      g.rect(x, y, 4, INNER.bottom - y).fill(capColor);
    }
    this.renderer.render({ container: g, target: this.rt, clear: true });
    g.destroy();
    this.stampCount = 0;
  }

  /** Queue a stamp. Everything queued this frame is baked in one render on flush(). */
  public stamp(
    texture: Texture,
    x: number,
    y: number,
    rotation: number,
    scale: number,
    tint = 0xffffff,
    alpha = 1,
  ) {
    const s = this.pool.pop() ?? new Sprite({ anchor: 0.5 });
    s.texture = texture;
    s.position.set(x, y);
    s.rotation = rotation;
    s.scale.set(scale);
    s.tint = tint;
    s.alpha = alpha;
    this.batch.addChild(s);
    this.stampCount++;
  }

  public flush() {
    if (this.batch.children.length === 0) return;
    this.renderer.render({
      container: this.batch,
      target: this.rt,
      clear: false,
    });
    const children = this.batch.removeChildren();
    for (const c of children) this.pool.push(c as Sprite);
  }
}
