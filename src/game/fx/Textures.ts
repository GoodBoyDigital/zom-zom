import type { Renderer } from "pixi.js";
import { Graphics, Texture } from "pixi.js";

import type { ZombieDef } from "../defs/zombies";
import { rand } from "../core/math";

/**
 * Placeholder art, generated at start-up from vector shapes.
 * Swap any of these for AssetPack sprites later without touching gameplay code.
 */
export interface ZombieTextures {
  bodies: Texture[];
  flash: Texture;
  corpses: Texture[];
}

export class GameTextures {
  public zombies = new Map<string, ZombieTextures>();
  public splats: Texture[] = [];
  public drop!: Texture;
  public playerBody!: Texture;
  public gun!: Texture;
  public muzzle!: Texture;
  public glow!: Texture;
  public spark!: Texture;
  public casing!: Texture;
  public vignette!: Texture;
  public shadow!: Texture;

  constructor(private readonly renderer: Renderer) {}

  public build(zombieDefs: ZombieDef[]) {
    for (const def of zombieDefs)
      this.zombies.set(def.id, this.buildZombie(def));
    for (let i = 0; i < 8; i++) this.splats.push(this.buildSplat());
    this.drop = this.bake(new Graphics().circle(0, 0, 4).fill(0xffffff));
    this.playerBody = this.buildPlayer();
    this.gun = this.bake(
      new Graphics()
        .roundRect(0, -4, 30, 8, 2)
        .fill(0x2b2b2e)
        .rect(4, -4, 22, 3)
        .fill(0x55555c)
        .rect(-4, -3, 8, 6)
        .fill(0x1d1d20),
    );
    this.muzzle = this.radial(64, [
      [0, "rgba(255,255,240,1)"],
      [0.25, "rgba(255,230,140,0.9)"],
      [0.6, "rgba(255,150,40,0.35)"],
      [1, "rgba(255,120,0,0)"],
    ]);
    this.glow = this.radial(128, [
      [0, "rgba(255,255,255,1)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    this.shadow = this.radial(64, [
      [0, "rgba(0,0,0,0.55)"],
      [0.7, "rgba(0,0,0,0.25)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    this.spark = this.bake(new Graphics().rect(0, -1, 10, 2).fill(0xffffff));
    this.casing = this.bake(
      new Graphics()
        .rect(-3, -1.5, 6, 3)
        .fill(0xd9a441)
        .rect(-3, -1.5, 2, 3)
        .fill(0xf5d27a),
    );
    this.vignette = this.buildVignette();
  }

  private bake(g: Graphics): Texture {
    const tex = this.renderer.generateTexture({
      target: g,
      antialias: true,
      resolution: 2,
    });
    g.destroy();
    return tex;
  }

  /** Generates a texture centred on (0,0) by padding the bounds symmetrically. */
  private bakeCentered(g: Graphics, half: number): Texture {
    g.rect(-half, -half, half * 2, half * 2).fill({ color: 0, alpha: 0.001 });
    return this.bake(g);
  }

  private buildZombie(def: ZombieDef): ZombieTextures {
    const bodies: Texture[] = [];
    const corpses: Texture[] = [];
    for (const cloth of def.clothes) {
      bodies.push(
        this.bakeCentered(this.drawZombie(def.skin, cloth, false), 26),
      );
      corpses.push(
        this.bakeCentered(this.drawZombie(def.skin, cloth, true), 30),
      );
    }
    const flash = this.bakeCentered(
      this.drawZombie(0xffffff, 0xffffff, false),
      26,
    );
    return { bodies, flash, corpses };
  }

  /** A zombie seen from above, facing +x. Corpses lie with arms flung out. */
  private drawZombie(skin: number, cloth: number, dead: boolean): Graphics {
    const g = new Graphics();
    const dark = dead ? 0.72 : 1;
    const s = shade(skin, dark);
    const c = shade(cloth, dark);
    if (dead) {
      g.roundRect(-6, -22, 8, 16, 4).fill(s); // arm flung up
      g.roundRect(-2, 8, 14, 7, 3.5).fill(s); // arm flung down-forward
      g.ellipse(-12, -5, 6, 4).fill(shade(0x2a2a2a, dark)); // legs
      g.ellipse(-12, 6, 6, 4).fill(shade(0x2a2a2a, dark));
    } else {
      g.roundRect(0, -13, 18, 6, 3).fill(s); // arms reaching forward
      g.roundRect(0, 7, 16, 6, 3).fill(s);
    }
    g.ellipse(0, 0, 9, 13).fill(c); // torso
    g.ellipse(-2, -4, 3, 3).fill(shade(cloth, dark * 0.75)); // grime
    g.circle(dead ? 10 : 6, dead ? -2 : 0, 7).fill(s); // head
    g.circle(dead ? 12 : 8, dead ? -4 : -2, 2).fill(shade(skin, dark * 0.6));
    return g;
  }

  private buildPlayer(): Texture {
    const g = new Graphics();
    g.ellipse(0, 0, 11, 15).fill(0x3f78a8); // jacket
    g.ellipse(0, 0, 11, 15).stroke({ width: 2, color: 0x9fd0ff });
    g.roundRect(-4, -15, 10, 6, 3).fill(0x3f78a8);
    g.circle(2, 0, 8).fill(0xe0b48a); // head
    g.circle(0, 0, 7).fill(0x3b2a1d); // hair
    return this.bakeCentered(g, 20);
  }

  private buildSplat(): Texture {
    const g = new Graphics();
    const blobs = 6 + Math.floor(Math.random() * 6);
    g.circle(0, 0, rand(10, 15)).fill(0xffffff);
    for (let i = 0; i < blobs; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(6, 26);
      g.circle(Math.cos(a) * d, Math.sin(a) * d, rand(2, 8)).fill(0xffffff);
    }
    // Directional streaks along +x so splats can point away from the shot.
    for (let i = 0; i < 4; i++) {
      const y = rand(-10, 10);
      const len = rand(20, 44);
      g.moveTo(0, y * 0.4)
        .lineTo(len, y)
        .stroke({ width: rand(1.5, 3.5), color: 0xffffff, cap: "round" });
      g.circle(len, y, rand(1.5, 3)).fill(0xffffff);
    }
    return this.bakeCentered(g, 48);
  }

  private radial(size: number, stops: [number, string][]): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    for (const [at, col] of stops) grad.addColorStop(at, col);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return Texture.from(canvas);
  }

  private buildVignette(): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(256, 160, 90, 256, 160, 300);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 320);
    return Texture.from(canvas);
  }
}

function shade(color: number, f: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) * f);
  const g = Math.min(255, ((color >> 8) & 0xff) * f);
  const b = Math.min(255, (color & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}
