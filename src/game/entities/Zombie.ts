import { Container, Sprite } from "pixi.js";

import type { Gate } from "../config";
import type { ZombieDef } from "../defs/zombies";

/** One zombie. Plain data plus its display object; behaviour lives in ZombieSystem. */
export class Zombie {
  public readonly view = new Container();
  public readonly shadow: Sprite;
  public readonly body: Sprite;
  public readonly flashSprite: Sprite;

  public def!: ZombieDef;
  public x = 0;
  public y = 0;
  /** Knockback velocity, separate from walking so hits feel punchy and decay cleanly. */
  public kx = 0;
  public ky = 0;
  public radius = 14;
  public speed = 60;
  public hp = 1;
  public alive = false;
  /** False while still walking in through a gate. */
  public inside = false;
  public gate!: Gate;
  /** The y the zombie aims for inside its gate opening. */
  public gateY = 0;
  public facing = 0;
  public wobble = 0;
  public flash = 0;
  public stagger = 0;
  public biteTimer = 0;
  public variant = 0;

  constructor() {
    this.shadow = new Sprite({ anchor: 0.5, scale: 0.55 });
    this.body = new Sprite({ anchor: 0.5 });
    this.flashSprite = new Sprite({ anchor: 0.5 });
    this.flashSprite.blendMode = "add";
    this.view.addChild(this.shadow, this.body, this.flashSprite);
  }
}
