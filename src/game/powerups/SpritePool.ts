import type { Container, Texture } from "pixi.js";
import { Sprite } from "pixi.js";

/** Tiny recycled-sprite pool for power-up effects. */
export class SpritePool {
  private readonly free: Sprite[] = [];

  public get(texture: Texture, layer: Container, blend: "add" | "normal") {
    const s = this.free.pop() ?? new Sprite({ anchor: 0.5 });
    s.texture = texture;
    s.blendMode = blend;
    s.alpha = 1;
    s.tint = 0xffffff;
    s.rotation = 0;
    s.scale.set(1);
    s.visible = true;
    layer.addChild(s);
    return s;
  }

  public release(s: Sprite) {
    s.removeFromParent();
    this.free.push(s);
  }
}
