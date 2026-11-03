import { ARENA, GATES } from "../config";
import { pick, rand } from "../core/math";
import type { ZombieDef } from "../defs/zombies";
import { ZOMBIES } from "../defs/zombies";
import type { ZombieSystem } from "./ZombieSystem";

/**
 * Feeds hordes in through the side gates. Pressure ramps with time survived.
 * Later: wave scripts, per-wave zombie mixes and boss events plug in here.
 */
export class Spawner {
  public time = 0;
  private hordeTimer = 0;
  private trickleTimer = 0;

  constructor(private readonly zombies: ZombieSystem) {}

  public reset() {
    this.time = 0;
    this.hordeTimer = 0.6;
    this.trickleTimer = 2;
  }

  /** Which zombie kind to spawn. Only walkers exist in the first prototype. */
  private pickDef(): ZombieDef {
    return ZOMBIES.walker;
  }

  public update(dt: number) {
    this.time += dt;
    const t = this.time;

    this.hordeTimer -= dt;
    if (this.hordeTimer <= 0) {
      this.hordeTimer = Math.max(1.4, 5 - t * 0.04);
      const size = Math.min(45, Math.round(10 + t * 0.3));
      // Early on hit one side; later both sides at once.
      if (t > 25 && Math.random() < 0.5) {
        this.horde(Math.ceil(size / 2), "left");
        this.horde(Math.ceil(size / 2), "right");
      } else {
        this.horde(size);
      }
    }

    this.trickleTimer -= dt;
    if (this.trickleTimer <= 0) {
      this.trickleTimer = Math.max(0.12, 0.7 - t * 0.006);
      this.horde(1);
    }
  }

  /** Spawn a clump of zombies just outside one gate. */
  public horde(size: number, side?: "left" | "right") {
    const gates = side ? GATES.filter((g) => g.side === side) : GATES;
    const gate = pick(gates);
    for (let i = 0; i < size; i++) {
      const depth = rand(20, 40 + size * 9);
      const x = gate.side === "left" ? -depth : ARENA.width + depth;
      const y = rand(gate.y0 + 16, gate.y1 - 16);
      this.zombies.spawn(this.pickDef(), gate, x, y);
    }
  }
}
