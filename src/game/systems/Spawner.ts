import { ARENA, GATES } from "../config";
import { pick, rand } from "../core/math";
import type { ZombieDef } from "../defs/zombies";
import { ZOMBIES } from "../defs/zombies";
import type { ZombieSystem } from "./ZombieSystem";

/**
 * Feeds hordes in through the side gates. The opening is deliberately quiet;
 * pressure, horde size and the brute mix rise steadily while the player survives.
 */
export class Spawner {
  public time = 0;
  private hordeTimer = 0;
  private trickleTimer = 0;
  /** Guarantees that the first small group visibly introduces the new enemy. */
  private openingBrutePending = true;

  constructor(private readonly zombies: ZombieSystem) {}

  public reset() {
    this.time = 0;
    // Let the player get oriented before the first small group reaches a gate.
    this.hordeTimer = 1.6;
    this.trickleTimer = 2.8;
    this.openingBrutePending = true;
  }

  /** A compact readout for UI/debugging: a new threat band every 30 seconds. */
  public get threatLevel() {
    return Math.min(9, 1 + Math.floor(this.time / 30));
  }

  /** Desired number alive. This is the main difficulty curve, not a sudden wave jump. */
  private targetPopulation() {
    return Math.min(220, Math.floor(12 + this.time * 0.72));
  }

  /** Which zombie kind to spawn. Brutes arrive after the opening and grow more common. */
  private pickDef(): ZombieDef {
    if (this.openingBrutePending) {
      this.openingBrutePending = false;
      return ZOMBIES.brute;
    }
    if (this.time < 35) return ZOMBIES.walker;
    // 8% at the first appearance, gradually reaching a one-in-three late-game mix.
    const bruteChance = Math.min(0.34, 0.08 + (this.time - 35) * 0.0018);
    return Math.random() < bruteChance ? ZOMBIES.brute : ZOMBIES.walker;
  }

  public update(dt: number) {
    this.time += dt;
    const t = this.time;
    const room = () =>
      Math.max(0, this.targetPopulation() - this.zombies.count);

    this.hordeTimer -= dt;
    if (this.hordeTimer <= 0 && room() > 0) {
      // Early groups are small and spaced out. The ramp settles into denser,
      // quicker pressure instead of leaping straight to a full swarm.
      this.hordeTimer = Math.max(2.1, 7 - t * 0.022);
      const size = Math.min(room(), Math.floor(3 + t * 0.12));
      if (t > 55 && Math.random() < Math.min(0.8, 0.25 + t * 0.003)) {
        const left = Math.ceil(size / 2);
        this.horde(left, "left");
        this.horde(size - left, "right");
      } else {
        this.horde(size);
      }
    }

    this.trickleTimer -= dt;
    if (this.trickleTimer <= 0 && room() > 0) {
      this.trickleTimer = Math.max(0.35, 2.3 - t * 0.011);
      this.horde(1);
    }
  }

  /** Spawn a clump of zombies just outside one gate, never past the current pressure cap. */
  public horde(size: number, side?: "left" | "right") {
    const amount = Math.min(
      size,
      Math.max(0, this.targetPopulation() - this.zombies.count),
    );
    if (amount <= 0) return;
    const gates = side ? GATES.filter((g) => g.side === side) : GATES;
    const gate = pick(gates);
    for (let i = 0; i < amount; i++) {
      const depth = rand(20, 40 + amount * 9);
      const x = gate.side === "left" ? -depth : ARENA.width + depth;
      const y = rand(gate.y0 + 30, gate.y1 - 30);
      this.zombies.spawn(this.pickDef(), gate, x, y);
    }
  }
}
