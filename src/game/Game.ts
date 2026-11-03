import type { Renderer } from "pixi.js";
import { Container } from "pixi.js";

import { Sfx } from "./audio/Sfx";
import { ARENA, FIXED_DT, MAX_STEPS_PER_FRAME } from "./config";
import type { Input } from "./core/Input";
import { rand, rayWallDistance } from "./core/math";
import type { WeaponDef, WeaponId } from "./defs/weapons";
import { WEAPON_ORDER, WEAPONS } from "./defs/weapons";
import { ZOMBIES } from "./defs/zombies";
import { Player } from "./entities/Player";
import type { Zombie } from "./entities/Zombie";
import { Effects } from "./fx/Effects";
import { Floor } from "./fx/Floor";
import { GameTextures } from "./fx/Textures";
import { Spawner } from "./systems/Spawner";
import { ZombieSystem } from "./systems/ZombieSystem";
import { Hud } from "./ui/Hud";

/**
 * Owns the simulation and the scene graph for one run.
 * Systems are plain classes; Game wires them together and runs a fixed-step loop.
 */
export class Game {
  /** Root display object. GameScreen adds this to the stage. */
  public readonly view = new Container();
  /** Camera: everything in world coordinates lives in here. */
  public readonly world = new Container();

  public readonly tex: GameTextures;
  public readonly floor: Floor;
  public readonly fx: Effects;
  public readonly zombies: ZombieSystem;
  public readonly player: Player;
  public readonly spawner: Spawner;
  public readonly hud: Hud;
  public readonly sfx = new Sfx();

  public weapon: WeaponDef = WEAPONS.rifle;
  public kills = 0;
  public shotsFired = 0;
  public hitsLanded = 0;
  public state: "playing" | "dead" = "playing";
  public paused = false;

  private accumulator = 0;
  private fireCooldown = 0;
  private deadTime = 0;
  private screenW = 1;
  private screenH = 1;
  private fitScale = 1;
  private baseX = 0;
  private baseY = 0;
  private readonly tmp = { x: 0, y: 0 };
  private readonly cam = { x: 0, y: 0 };
  /** Aim point in world space. */
  public aimX = ARENA.width / 2;
  public aimY = 0;

  constructor(
    renderer: Renderer,
    private readonly input: Input,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.tex = new GameTextures(renderer);
    this.tex.build(Object.values(ZOMBIES));
    this.floor = new Floor(renderer);
    this.fx = new Effects(this.tex, this.floor);
    this.zombies = new ZombieSystem(this.tex);
    this.player = new Player(this.tex);
    this.spawner = new Spawner(this.zombies);
    this.hud = new Hud(this.tex);

    this.world.addChild(
      this.floor.view,
      this.fx.under,
      this.zombies.view,
      this.player.view,
      this.fx.over,
    );
    this.view.addChild(this.world, this.hud.view);

    this.zombies.onBite = (z) => this.onBite(z);
    canvas.addEventListener("pointerdown", this.unlockAudio);
    window.addEventListener("keydown", this.unlockAudio);
    this.reset();
  }

  public destroy() {
    this.canvas.removeEventListener("pointerdown", this.unlockAudio);
    window.removeEventListener("keydown", this.unlockAudio);
  }

  private unlockAudio = () => this.sfx.unlock();

  public reset() {
    this.floor.reset();
    this.fx.reset();
    this.zombies.reset();
    this.spawner.reset();
    this.hud.reset();
    this.player.reset(ARENA.width / 2, ARENA.height / 2);
    this.kills = 0;
    this.shotsFired = 0;
    this.hitsLanded = 0;
    this.state = "playing";
    this.accumulator = 0;
    this.fireCooldown = 0;
    this.deadTime = 0;
    this.aimX = ARENA.width / 2 + 200;
    this.aimY = ARENA.height / 2;
  }

  public resize(w: number, h: number) {
    this.screenW = w;
    this.screenH = h;
    const viewW = ARENA.width + ARENA.viewMargin * 2;
    const viewH = ARENA.height + ARENA.viewMargin * 2;
    this.fitScale = Math.min(w / viewW, h / viewH);
    this.baseX = w / 2 - (ARENA.width / 2) * this.fitScale;
    this.baseY = h / 2 - (ARENA.height / 2) * this.fitScale;
    this.hud.resize(w, h);
  }

  /** Called every rendered frame with real elapsed seconds. */
  public frame(elapsed: number) {
    if (!this.paused) {
      this.accumulator += Math.min(elapsed, FIXED_DT * MAX_STEPS_PER_FRAME);
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        this.step(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps++;
      }
    }
    this.render(elapsed);
  }

  private step(dt: number) {
    const input = this.input;
    this.updateAim();

    for (let i = 0; i < WEAPON_ORDER.length; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) this.setWeapon(WEAPON_ORDER[i]);
    }

    if (this.state === "playing") {
      const move = input.moveAxis();
      this.player.aim = Math.atan2(
        this.aimY - this.player.y,
        this.aimX - this.player.x,
      );
      this.player.update(dt, move.x, move.y);
      this.fireCooldown -= dt;
      if (input.fireHeld && this.fireCooldown <= 0) {
        this.fire();
        this.fireCooldown =
          Math.max(this.fireCooldown, -dt) + 1 / this.weapon.fireRate;
      }
      this.spawner.update(dt);
    } else {
      this.player.update(dt, 0, 0);
      this.deadTime += dt;
      if (
        this.deadTime > 0.8 &&
        (input.wasPressed("KeyR") ||
          input.wasPressed("Space") ||
          input.fireHeld)
      ) {
        input.fireHeld = false;
        this.reset();
        input.consumePresses();
        return;
      }
    }

    this.zombies.update(dt, this.player);
    this.fx.update(dt);
    input.consumePresses();
  }

  public setWeapon(id: WeaponId) {
    this.weapon = WEAPONS[id];
    this.fireCooldown = Math.min(this.fireCooldown, 0.1);
  }

  private updateAim() {
    const input = this.input;
    if (!input.hasMouse) return;
    // Canvas CSS pixels -> renderer screen pixels -> world (without shake, so aim is steady).
    const rect = this.canvas.getBoundingClientRect();
    const sx = (input.mouseX * this.screenW) / (rect.width || 1);
    const sy = (input.mouseY * this.screenH) / (rect.height || 1);
    this.aimX = (sx - this.baseX) / this.fitScale;
    this.aimY = (sy - this.baseY) / this.fitScale;
  }

  /** One trigger pull: every pellet is an instant line test, closest zombie first. */
  private fire() {
    const w = this.weapon;
    const p = this.player;
    const baseAngle = p.aim;
    const muzzle = p.muzzle(this.tmp);
    const mx = muzzle.x;
    const my = muzzle.y;
    const power = Math.min(1, w.recoil / 320);
    this.shotsFired++;

    for (let i = 0; i < w.pellets; i++) {
      const a = baseAngle + rand(-w.spread / 2, w.spread / 2);
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      // Rays start at the body centre so zombies hugging the player still get hit.
      const wallT = rayWallDistance(p.x, p.y, dx, dy, w.range);
      const hits = this.zombies.raycast(p.x, p.y, dx, dy, wallT, w.pierce);
      let endT = wallT;
      if (hits.length > 0 && hits.length >= w.pierce)
        endT = hits[hits.length - 1].t + 4;
      for (const h of hits) {
        this.hitsLanded++;
        this.hitZombie(h.zombie, p.x + dx * h.t, p.y + dy * h.t, dx, dy, w);
      }
      const ex = p.x + dx * endT;
      const ey = p.y + dy * endT;
      this.fx.tracer(
        mx,
        my,
        ex,
        ey,
        w.tracerWidth,
        w.tracerColor,
        w.tracerLife,
      );
      if (hits.length === 0 && endT < w.range) {
        // Hit a wall: sparks and a scorch on the floor.
        this.fx.impactSparks(ex, ey, dx, dy, 4);
        this.floor.stamp(
          this.tex.drop,
          ex - dx * 3,
          ey - dy * 3,
          0,
          rand(0.5, 0.9),
          0x111111,
          0.5,
        );
      }
    }

    // Feel: kick the gun and the player back, flash, shake, nudge camera, eject a case.
    p.gunKick = w.gunKick;
    p.vx -= Math.cos(baseAngle) * w.recoil;
    p.vy -= Math.sin(baseAngle) * w.recoil;
    this.fx.muzzleFlash(mx, my, baseAngle, power);
    this.fx.addShake(w.shake);
    this.fx.addKick(
      -Math.cos(baseAngle) * w.cameraKick,
      -Math.sin(baseAngle) * w.cameraKick,
    );
    this.fx.casing(
      p.x + Math.cos(baseAngle) * 14,
      p.y + Math.sin(baseAngle) * 14,
      baseAngle,
    );
    this.sfx.shot(power);
  }

  private hitZombie(
    z: Zombie,
    hx: number,
    hy: number,
    dx: number,
    dy: number,
    w: WeaponDef,
  ) {
    const blood = z.def.blood;
    z.hp -= w.damage;
    z.kx += (dx * w.knockback) / z.def.mass;
    z.ky += (dy * w.knockback) / z.def.mass;
    z.stagger = 0.14;
    z.flash = 1;
    const angle = Math.atan2(dy, dx);
    // Splat paints the floor behind the zombie, pointing away from the shot.
    const back = rand(10, 34);
    this.floor.stamp(
      this.pickSplat(),
      hx + dx * back,
      hy + dy * back,
      angle,
      rand(0.45, 0.8),
      0x3d8a17,
      0.9,
    );
    this.floor.stamp(
      this.pickSplat(),
      hx + dx * back * 0.6,
      hy + dy * back * 0.6,
      angle,
      rand(0.25, 0.45),
      0x9dff4a,
      0.85,
    );
    this.fx.gore(hx, hy, dx, dy, 5, blood);
    this.fx.impactSparks(hx, hy, dx, dy, 3, 0xd8ff9a);
    this.fx.impactFlash(hx, hy, 0xc8ff80, 0.45);
    this.sfx.hit();
    if (z.hp <= 0) this.killZombie(z, dx, dy);
  }

  private killZombie(z: Zombie, dx: number, dy: number) {
    const angle = Math.atan2(dy, dx);
    const textures = this.tex.zombies.get(z.def.id)!;
    // Big pool first, then the body on top of it, then a fresh spray. All baked into the floor.
    this.floor.stamp(
      this.pickSplat(),
      z.x + dx * 14,
      z.y + dy * 14,
      angle,
      rand(1.1, 1.6),
      0x2f6e12,
      0.9,
    );
    this.floor.stamp(
      textures.corpses[z.variant],
      z.x + dx * 8,
      z.y + dy * 8,
      angle + rand(-0.5, 0.5),
      z.radius / z.def.radius,
    );
    this.floor.stamp(
      this.pickSplat(),
      z.x + dx * 26,
      z.y + dy * 26,
      angle,
      rand(0.5, 0.8),
      0x8cff3a,
      0.8,
    );
    this.fx.gore(z.x, z.y, dx, dy, 14, z.def.blood);
    this.fx.addShake(0.05);
    this.sfx.splat();
    this.zombies.kill(z);
    this.kills++;
  }

  private pickSplat() {
    return this.tex.splats[Math.floor(Math.random() * this.tex.splats.length)];
  }

  private onBite(z: Zombie) {
    if (this.state !== "playing") return;
    const p = this.player;
    p.hp -= z.def.biteDamage;
    p.hurt = 1;
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * 120;
    p.vy += (dy / d) * 120;
    this.fx.addShake(0.25);
    this.sfx.hurt();
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      this.state = "dead";
      this.deadTime = 0;
      this.input.fireHeld = false;
      this.fx.addShake(0.8);
      // The player leaves a stain too.
      this.floor.stamp(
        this.pickSplat(),
        p.x,
        p.y,
        rand(0, 6.28),
        1.5,
        0x6a0d0d,
        0.95,
      );
      this.hud.showGameOver(this.kills, this.spawner.time);
    }
  }

  private render(elapsed: number) {
    this.player.sync();
    this.floor.flush();
    const off = this.fx.cameraOffset(this.cam);
    this.world.scale.set(this.fitScale);
    this.world.position.set(
      this.baseX + off.x * this.fitScale,
      this.baseY + off.y * this.fitScale,
    );

    const rect = this.canvas.getBoundingClientRect();
    this.hud.update(elapsed, {
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      kills: this.kills,
      alive: this.zombies.count,
      time: this.spawner.time,
      weapon: this.weapon.name,
      hurt: this.player.hurt,
      mouseX: (this.input.mouseX * this.screenW) / (rect.width || 1),
      mouseY: (this.input.mouseY * this.screenH) / (rect.height || 1),
      hasMouse: this.input.hasMouse,
    });
  }
}
